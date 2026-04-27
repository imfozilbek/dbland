use serde::{Deserialize, Serialize};
use ssh2::Session;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::{Arc, Mutex};
use std::thread;
use thiserror::Error;

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
        *active.lock().unwrap() = true;

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
                *active.lock().unwrap() = false;
            }
        });

        Ok(())
    }

    /// Stop the SSH tunnel
    pub fn stop(&mut self) {
        *self.active.lock().unwrap() = false;
    }

    /// Check if tunnel is active
    pub fn is_active(&self) -> bool {
        *self.active.lock().unwrap()
    }

    /// Run the tunnel (internal)
    fn run_tunnel(
        config: SSHTunnelConfig,
        local_port: u16,
        remote_host: String,
        remote_port: u16,
        active: Arc<Mutex<bool>>,
    ) -> Result<(), SSHTunnelError> {
        // Create SSH session
        let tcp = TcpStream::connect(format!("{}:{}", config.host, config.port))
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

        // Start listening on local port
        let listener = TcpListener::bind(format!("127.0.0.1:{}", local_port))?;

        // Accept connections and forward through SSH
        while *active.lock().unwrap() {
            if let Ok((mut local_stream, _)) = listener.accept() {
                // Create SSH channel
                let mut channel = session
                    .channel_direct_tcpip(&remote_host, remote_port, None)
                    .map_err(|e| SSHTunnelError::TunnelCreationFailed(e.to_string()))?;

                // Forward data bidirectionally
                thread::spawn(move || {
                    let _ = Self::forward_data(&mut local_stream, &mut channel);
                });
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
