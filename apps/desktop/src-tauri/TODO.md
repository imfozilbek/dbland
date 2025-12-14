# Tauri Backend TODO

## Current Sprint: v0.5.0 - SSH Tunnel

### In Progress

- [ ] russh integration
- [ ] Password auth
- [ ] Key file auth

### Backlog

- [ ] Agent auth
- [ ] Connection through SSH tunnel

---

## Done (v0.4.0 - Connection Storage)

- [x] SQLite setup
- [x] save_connection command
- [x] get_connections command
- [x] delete_connection command
- [x] AES-256-GCM encryption

---

## Done (v0.3.0 - Redis Commands)

- [x] connect_redis
- [x] get_keys (via prefix grouping)
- [x] Command execution
- [x] Value type conversion

---

## Done (v0.2.0 - MongoDB Commands)

- [x] connect_mongodb command
- [x] disconnect command
- [x] execute_query command
- [x] get_databases command
- [x] get_collections command
- [x] get_documents command (via execute_query)

---

## Done (v0.1.0)

- [x] Tauri 2.0 config
- [x] Window setup
- [x] IPC commands structure
- [x] Build and test

---

## Technical Debt

None currently.
