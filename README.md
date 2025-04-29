# <img src="./public/BastionLogo.ico" alt="Bastion Logo" width="120" />

# Bastion

Bastion is a secure, privacy-focused vault application designed to help users store, organize, and manage sensitive files and information on their local device. Bastion prioritizes user privacy and data security at every level of its design and implementation. Bastion is part of the AEGIS suite of security apps. 

## What is Bastion?

Bastion is a desktop application that provides a digital vault for your confidential files and documents. It is intended for users who require a high level of security and privacy for their data, such as personal records, credentials, or sensitive work documents. Bastion ensures that your data remains private and inaccessible to unauthorized users.

## What Does Bastion Do?

- Stores files and documents in an encrypted vault on your local machine.
- Requires a master password to unlock and access the vault.
- Prevents any access to vault contents until the correct master password is entered.
- Provides a user-friendly dashboard and file browser for managing your secure files.
- Ensures that no sensitive information is displayed or accessible before authentication.

## How Does Bastion Work?

Bastion operates entirely on your local device. When you launch the application, you are immediately prompted for your master password. Until the correct password is entered, all vault contents remain hidden and inaccessible. The dashboard and file browser only become visible after successful authentication, ensuring that your sensitive data is never exposed unintentionally.

All files stored in Bastion are encrypted using strong, industry-standard cryptographic algorithms. The master password is never stored in plaintext, and all cryptographic operations are performed locally. Bastion does not transmit your data or password over the internet, nor does it rely on any external servers. This local-first approach maximizes privacy and minimizes attack surfaces.

## Security Emphasis

- **End-to-End Encryption:** All files are encrypted at rest using robust cryptographic standards.
- **Master Password Protection:** The vault is protected by a master password, which is required for access.
- **Zero Knowledge:** Bastion never stores or transmits your password or unencrypted data.
- **No Cloud Dependency:** All operations are performed locally; your data never leaves your device.
- **Privacy by Design:** The application interface is designed to never reveal sensitive information before authentication.

## Technologies Used

- **React** for the user interface
- **Electron** for cross-platform desktop application support
- **Tailwind CSS** for styling and responsive design
- **Node.js** for backend logic and file system operations
- **Cryptography libraries** for secure encryption and decryption

## Getting Started

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Run the app with `npm start`.

## License

Bastion is provided under the MIT License.

---

Bastion is designed for users who value privacy and security above all. By keeping your data local and encrypted, Bastion ensures that your sensitive information remains yours—and yours alone.