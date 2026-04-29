use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use ssh2::Session;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream, ToSocketAddrs};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use thiserror::Error;

/// Hard ceiling on how long we wait for the TCP handshake to the
/// jump host. `TcpStream::connect` with no timeout is documented to
/// rely on the OS default, which on macOS / Linux can stretch to 75s
/// or more — long enough that the user thinks the app has hung. 10s
/// is a generous bound for any healthy network path; an unreachable
/// host should fail fast and let the user retry.
const SSH_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);

/// How long the accept loop sleeps when no client is dialling in.
/// Has to be short enough that `stop()` tears the tunnel down with no
/// user-visible delay, but long enough that the polling loop doesn't
/// burn measurable CPU on an idle tunnel. 200 ms is on the same order
/// as a typical UI animation frame, so a "Disconnect" click feels
/// instant without the loop showing up in `top`.
const ACCEPT_POLL_INTERVAL: Duration = Duration::from_millis(200);

/// Map an SSH tunnel error to a non-sensitive label so the variant kind
/// can be logged without leaking host, user, or auth details.
fn error_kind(err: &SSHTunnelError) -> &'static str {
    match err {
        SSHTunnelError::ConnectionFailed(_) => "connection_failed",
        SSHTunnelError::AuthenticationFailed(_) => "authentication_failed",
        SSHTunnelError::TunnelCreationFailed(_) => "tunnel_creation_failed",
        SSHTunnelError::IoError(_) => "io_error",
        SSHTunnelError::SshError(_) => "ssh_error",
    }
}

#[derive(Error, Debug)]
pub enum SSHTunnelError {
    #[error("SSH connection failed: {0}")]
    ConnectionFailed(String),
    #[error("SSH authentication failed: {0}")]
    AuthenticationFailed(String),
    #[error("Tunnel creation failed: {0}")]
    TunnelCreationFailed(String),
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
    #[error("SSH error: {0}")]
    SshError(#[from] ssh2::Error),
}

/// SSH authentication method
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SSHAuthMethod {
    Password,
    Key,
    Agent,
}

/// SSH tunnel configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SSHTunnelConfig {
    pub enabled: bool,
    pub host: String,
    pub port: u16,
    pub username: String,
    #[serde(rename = "authMethod")]
    pub auth_method: SSHAuthMethod,
    pub password: Option<String>,
    #[serde(rename = "privateKeyPath")]
    pub private_key_path: Option<String>,
    pub passphrase: Option<String>,
}

/// SSH tunnel instance
pub struct SSHTunnel {
    config: SSHTunnelConfig,
    local_port: u16,
    remote_host: String,
    remote_port: u16,
    active: Arc<Mutex<bool>>,
}

impl SSHTunnel {
    /// Create a new SSH tunnel
    pub fn new(
        config: SSHTunnelConfig,
        remote_host: String,
        remote_port: u16,
    ) -> Result<Self, SSHTunnelError> {
        // Find an available local port
        let listener = TcpListener::bind("127.0.0.1:0")?;
        let local_port = listener.local_addr()?.port();
        drop(listener);

        Ok(Self {
            config,
            local_port,
            remote_host,
            remote_port,
            active: Arc::new(Mutex::new(false)),
        })
    }

    /// Get the local port for the tunnel
    pub fn local_port(&self) -> u16 {
        self.local_port
    }

    /// Start the SSH tunnel
    pub fn start(&mut self) -> Result<(), SSHTunnelError> {
        let config = self.config.clone();
        let local_port = self.local_port;
        let remote_host = self.remote_host.clone();
        let remote_port = self.remote_port;
        let active = Arc::clone(&self.active);

        // Set active flag
        *active.lock() = true;

        // Spawn tunnel thread
        thread::spawn(move || {
            if let Err(e) = Self::run_tunnel(
                config,
                local_port,
                remote_host,
                remote_port,
                Arc::clone(&active),
            ) {
                // Log only the error variant name, never the full payload
                // (it may contain host/user details that are sensitive in shared logs).
                log::warn!("ssh tunnel terminated: {}", error_kind(&e));
                *active.lock() = false;
            }
        });

        Ok(())
    }

    /// Stop the SSH tunnel
    pub fn stop(&mut self) {
        *self.active.lock() = false;
    }

    /// Run the tunnel (internal)
    fn run_tunnel(
        config: SSHTunnelConfig,
        local_port: u16,
        remote_host: String,
        remote_port: u16,
        active: Arc<Mutex<bool>>,
    ) -> Result<(), SSHTunnelError> {
        // Create SSH session.
        //
        // Resolve and bound the TCP handshake explicitly. `TcpStream::
        // connect` without a timeout falls back to the OS default,
        // which on Linux/macOS can stretch to 75s+ — long enough that
        // the user thinks the app has hung. A jump host that doesn't
        // answer should bubble up a fast `ConnectionFailed` so the
        // caller can show a clear error, not freeze the dialog.
        let target = format!("{}:{}", config.host, config.port);
        let mut addrs = target
            .to_socket_addrs()
            .map_err(|e| SSHTunnelError::ConnectionFailed(e.to_string()))?;
        let addr = addrs.next().ok_or_else(|| {
            SSHTunnelError::ConnectionFailed(format!("no DNS results for {}", config.host))
        })?;
        let tcp = TcpStream::connect_timeout(&addr, SSH_CONNECT_TIMEOUT)
            .map_err(|e| SSHTunnelError::ConnectionFailed(e.to_string()))?;

        let mut session = Session::new()?;
        session.set_tcp_stream(tcp);
        session.handshake()?;

        // Authenticate
        match config.auth_method {
            SSHAuthMethod::Password => {
                let password = config
                    .password
                    .ok_or_else(|| {
                        SSHTunnelError::AuthenticationFailed("Password not provided".to_string())
                    })?;
                session
                    .userauth_password(&config.username, &password)
                    .map_err(|e| SSHTunnelError::AuthenticationFailed(e.to_string()))?;
            }
            SSHAuthMethod::Key => {
                let key_path = config.private_key_path.ok_or_else(|| {
                    SSHTunnelError::AuthenticationFailed("Private key path not provided".to_string())
                })?;
                session
                    .userauth_pubkey_file(
                        &config.username,
                        None,
                        std::path::Path::new(&key_path),
                        config.passphrase.as_deref(),
                    )
                    .map_err(|e| SSHTunnelError::AuthenticationFailed(e.to_string()))?;
            }
            SSHAuthMethod::Agent => {
                let mut agent = session.agent()?;
                agent.connect()?;
                agent.list_identities()?;
                let identities = agent.identities()?;
                let identity = identities.first().ok_or_else(|| {
                    SSHTunnelError::AuthenticationFailed("No SSH agent identities found".to_string())
                })?;
                agent
                    .userauth(&config.username, identity)
                    .map_err(|e| SSHTunnelError::AuthenticationFailed(e.to_string()))?;
            }
        }

        if !session.authenticated() {
            return Err(SSHTunnelError::AuthenticationFailed(
                "Authentication failed".to_string(),
            ));
        }

        // Start listening on local port.
        //
        // Non-blocking + short poll instead of a blocking `accept()`.
        // The previous loop only re-checked the `active` flag *after*
        // an incoming connection completed — so calling `stop()` while
        // the user wasn't actively using the tunnel left the spawned
        // accept-loop thread stuck in `accept()` indefinitely (until
        // process exit, or until one more client happened to dial in
        // and unblock it). With non-blocking accept and a 200 ms idle
        // sleep, `stop()` reliably tears the loop down within a tick
        // without busy-spinning.
        let listener = TcpListener::bind(format!("127.0.0.1:{}", local_port))?;
        listener.set_nonblocking(true)?;

        while *active.lock() {
            match listener.accept() {
                Ok((mut local_stream, _)) => {
                    // Reset the per-connection stream to blocking — the
                    // forward loop reads/writes synchronously on it,
                    // and inheriting the listener's non-blocking flag
                    // would turn every read into a busy `WouldBlock`.
                    let _ = local_stream.set_nonblocking(false);

                    let mut channel = session
                        .channel_direct_tcpip(&remote_host, remote_port, None)
                        .map_err(|e| SSHTunnelError::TunnelCreationFailed(e.to_string()))?;

                    thread::spawn(move || {
                        let _ = Self::forward_data(&mut local_stream, &mut channel);
                    });
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    thread::sleep(ACCEPT_POLL_INTERVAL);
                }
                Err(_) => break,
            }
        }

        Ok(())
    }

    /// Forward data between local and remote streams
    fn forward_data(
        local: &mut TcpStream,
        remote: &mut ssh2::Channel,
    ) -> Result<(), std::io::Error> {
        let mut local_clone = local.try_clone()?;
        let mut remote_clone = remote.stream(0);

        // Local -> Remote
        let handle1 = thread::spawn(move || {
            let mut buffer = [0u8; 8192];
            loop {
                match local_clone.read(&mut buffer) {
                    Ok(0) => break,
                    Ok(n) => {
                        if remote_clone.write_all(&buffer[..n]).is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
        });

        // Remote -> Local
        let mut buffer = [0u8; 8192];
        loop {
            match remote.read(&mut buffer) {
                Ok(0) => break,
                Ok(n) => {
                    if local.write_all(&buffer[..n]).is_err() {
                        break;
                    }
                }
                Err(_) => break,
            }
        }

        let _ = handle1.join();
        Ok(())
    }
}

/// Belt-and-braces cleanup: if an `SSHTunnel` is dropped without an
/// explicit `stop()` first, flip the `active` flag here so the
/// background accept-loop thread (which holds its own
/// `Arc<Mutex<bool>>` clone) notices on the next 200 ms tick and
/// unwinds. Without this, dropping a tunnel via panic-unwind, error
/// path, or simply forgetting the explicit teardown would leak the
/// listener thread for the rest of the process lifetime.
///
/// `stop()` stays public because the existing call sites (the pool's
/// `disconnect`) want deterministic teardown *before* the struct
/// drops; `Drop` is just the safety net.
impl Drop for SSHTunnel {
    fn drop(&mut self) {
        *self.active.lock() = false;
    }
}
