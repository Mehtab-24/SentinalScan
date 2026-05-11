# SentinelScan 🔒

SentinelScan is a DevSecOps web application that analyzes public GitHub repositories for security vulnerabilities using automated scanning tools.

---

## 🚀 Features

- **Submit GitHub Repositories**: Easily submit any public GitHub repository URL for analysis.
- **Asynchronous Security Scanning**: Scans are performed asynchronously for responsiveness.
- **Integrated Security Tools**: Utilizes [Semgrep](https://semgrep.dev/) (SAST) and [Trivy](https://aquasecurity.github.io/trivy/) for comprehensive security checks.
- **Severity-Based Scoring**: Reports highlight vulnerabilities by severity.
- **Scan History**: Keep track of all past security scans.

---

## 🛠️ Tech Stack

- **Backend**: Spring Boot (Java 17)
- **Database**: PostgreSQL
- **DevOps**: Docker, GitHub Actions (planned)
- **Security Tools**: Semgrep, Trivy

---

## ⚙️ Project Status

- ✅ **Backend:** Complete
- 🚧 **Frontend:** In Progress

---

## 📦 Installation

> **Note:** For full functionality, ensure both [Semgrep](https://semgrep.dev/docs/getting-started/) and [Trivy](https://aquasecurity.github.io/trivy/v0.44/docs/) are installed locally.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Mehtab-24/SentinalScan.git
   cd SentinalScan
   ```

2. **Start the Backend:**
   ```bash
   ./mvnw spring-boot:run
   ```

3. **(Optional) Start with Docker:**
   ```bash
   docker compose up
   ```

---

## 📊 Roadmap

- [ ] Interactive frontend dashboard (React)
- [ ] CI/CD pipeline integration
- [ ] Docker deployment
- [ ] AI-based vulnerability prioritization/insights

---

## 🤝 Contributing

Contributions are welcome! To get started:

1. Fork this repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Submit a pull request

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 📞 Contact

For questions or support, please open an [issue](https://github.com/Mehtab-24/SentinalScan/issues) or contact [Mehtab-24](https://github.com/Mehtab-24).
