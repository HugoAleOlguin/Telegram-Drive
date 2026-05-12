<div align="center">
  <img src="src-tauri/icons/icon.png" alt="Telegram Drive" width="128" height="128">

  # Telegram Drive

  <p><strong>Turn your Telegram Saved Messages into unlimited, private cloud storage.</strong></p>
  <p>No third-party servers. No subscriptions. No bots. Just you and Telegram.</p>

  <p>
    <a href="https://github.com/HugoAleOlguin/Telegram-Drive/releases">
      <img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapi.github.com%2Frepos%2FHugoAleOlguin%2FTelegram-Drive%2Freleases%2Flatest&query=%24.tag_name&style=for-the-badge&logo=windows&logoColor=white&label=Download&color=3b82f6" alt="Download">
    </a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/version-1.5.1-3b82f6?style=flat-square&logo=semver" alt="Version">
    <img src="https://img.shields.io/badge/Windows_10%2B-00a4ef?style=flat-square&logo=windows&logoColor=white" alt="Windows">
    <img src="https://img.shields.io/badge/license-MIT-22c55e?style=flat-square" alt="License">
    <img src="https://img.shields.io/badge/built_with-Rust_%7C_React_%7C_Tauri-f97316?style=flat-square&logo=rust" alt="Built With">
    <img src="https://img.shields.io/badge/contributions-welcome-8b5cf6?style=flat-square" alt="Contributions">
  </p>

  <br>

  <table>
    <tr>
      <td width="33%" align="center"><img src="public/guia/1%20-%20guide.png" alt="Login" width="280"></td>
      <td width="33%" align="center"><img src="public/guia/2%20-%20guide.png" alt="Drive" width="280"></td>
      <td width="33%" align="center"><img src="public/guia/4%20-%20guide%20-%20Editado.png" alt="Settings" width="280"></td>
    </tr>
  </table>
</div>

<br>

---

## What is Telegram Drive?

**Telegram Drive** is a **Windows desktop application** that transforms your Telegram Saved Messages into a full-featured cloud drive with a modern, Google-Drive-like interface.

Upload, download, rename, delete — all from a clean native app.
Your files are stored as regular messages in your private Telegram chat. **They never leave your account.**

### Why Telegram Drive?

| Instead of... | Use Telegram Drive |
|---|---|
| Paying for Google Drive / iCloud / OneDrive | **Free** — Telegram doesn't charge for storage |
| Uploading to third-party file hosts | **Private** — only you can see your files |
| Using Telegram's bare chat interface to find files | **Organized** — grouped by month, with filters & search |
| Scrolling through endless messages to find a document | **Instant** — local index with search & sort |
| Setting up bots, APIs, or self-hosted servers | **One-click install** — just download and run |

---

## Features

<div align="center">
  <table>
    <tr>
      <td align="center">Multi-file upload</td>
      <td>Select multiple files at once with real-time progress</td>
      <td align="center">Organized by month</td>
      <td>Files grouped automatically, like Google Photos</td>
    </tr>
    <tr>
      <td align="center">One-click download</td>
      <td>Save dialog opens immediately</td>
      <td align="center">Local rename</td>
      <td>Custom names that only you see</td>
    </tr>
    <tr>
      <td align="center">Permanent delete</td>
      <td>Removes from Telegram + local index</td>
      <td align="center">Search & filter</td>
      <td>Filter by type (IMG, PDF, ZIP...) + sort by date/name/size</td>
    </tr>
    <tr>
      <td align="center">Sync</td>
      <td>Pull new files from Telegram automatically</td>
      <td align="center">Dark & Light themes</td>
      <td>Choose your preferred look</td>
    </tr>
    <tr>
      <td align="center">EN / ES</td>
      <td>Full English and Spanish support</td>
      <td align="center">Right-click menu</td>
      <td>Quick actions on any file</td>
    </tr>
    <tr>
      <td align="center">Grid & List views</td>
      <td>Toggle between visual grid or compact list</td>
      <td align="center">Drag & drop</td>
      <td>Drop files anywhere to start upload</td>
    </tr>
  </table>
</div>

---

## How to Get Your API Credentials

> Telegram Drive connects directly to Telegram's servers using their API.
> You need to get **free API credentials** from Telegram. It takes 2 minutes.

<details>
  <summary><strong>Click here to see the step-by-step guide with screenshots</strong></summary>

  <br>

  ### **Step 1:** Go to my.telegram.org

  <div align="center">
    <kbd><img src="public/guia/1%20-%20guide.png" alt="Step 1: my.telegram.org" width="420"></kbd>
  </div>

  Open [my.telegram.org](https://my.telegram.org) in your browser and sign in with your phone number (the same one you use on Telegram).

  <br>

  ### **Step 2:** Open API Development Tools

  <div align="center">
    <kbd><img src="public/guia/2%20-%20guide.png" alt="Step 2: API Development Tools" width="420"></kbd>
  </div>

  Click on **"API Development Tools"** — you'll be taken to the app creation page.

  <br>

  ### **Step 3:** Create a New Application

  <div align="center">
    <kbd><img src="public/guia/3%20-%20guide.png" alt="Step 3: Create Application" width="420"></kbd>
  </div>

  Fill in the form:
  - **App title**: anything (e.g. "My Drive")
  - **Short name**: anything short
  - **URL**: optional, leave blank or use `https://telegram.org`
  - **Platform**: choose "Desktop"

  Click **"Create application"**.

  <br>

  ### **Step 4:** Copy Your Credentials

  <div align="center">
    <kbd><img src="public/guia/4%20-%20guide%20-%20Editado.png" alt="Step 4: Copy Credentials" width="420"></kbd>
  </div>

  At the top of the page you'll see:
  - **App api_id** → a number (e.g. `1234567`)
  - **App api_hash** → a long string of letters and numbers

  > **Important:** Keep these private. They're like a username and password for your app.

  Copy both and paste them into Telegram Drive when asked. **That's it!**

</details>

---

## Download & Install

<div align="center">
  <a href="https://github.com/HugoAleOlguin/Telegram-Drive/releases">
    <img src="https://img.shields.io/badge/Download_Telegram_Drive_1.5.1_for_Windows-3b82f6?style=for-the-badge&logo=windows&logoColor=white" alt="Download">
  </a>
</div>

### System Requirements

| Requirement | Detail |
|-------------|--------|
| **OS** | Windows 10 or later (64-bit) |
| **Storage** | ~150 MB for the app + local database grows with your files |
| **Internet** | Required to connect to Telegram |
| **Account** | A regular Telegram account (not a bot) |

### Portable (recommended)

1. Download the `TelegramDrive_v1.5.1_portable.zip` from the [Releases page](https://github.com/HugoAleOlguin/Telegram-Drive/releases)
2. Extract the `.zip` anywhere you want (USB drive, desktop, etc.)
3. Run `Telegram Drive.exe`

No installation required. The app is fully portable — take it anywhere.

---

## Security & Privacy FAQ

<details>
  <summary><strong>Where are my files stored?</strong></summary>
  Inside your Telegram Saved Messages chat — the private chat you have with yourself. Files are stored as document messages on Telegram's servers.
</details>

<details>
  <summary><strong>Can anyone else see my files?</strong></summary>
  No. They're in your private chat. Only you can access them (unless you share your Telegram account or your session file).
</details>

<details>
  <summary><strong>Does the app send data anywhere?</strong></summary>
  No. Zero telemetry, zero analytics, zero third-party servers. The app only communicates directly with Telegram's MTProto servers using your credentials. There is no middleman.
</details>

<details>
  <summary><strong>Where are my API keys stored?</strong></summary>
  On your local machine in a SQLite database. They are never sent anywhere except to Telegram's servers during authentication.
</details>

<details>
  <summary><strong>What happens if I delete the app?</strong></summary>
  Your files remain safely in Telegram. You only lose the local index (which files you uploaded), but syncing again will restore it.
</details>

<details>
  <summary><strong>Is there any cost?</strong></summary>
  **Zero.** Telegram doesn't charge for storing messages. The app is free and open source under the MIT license.
</details>

<details>
  <summary><strong>Is there a storage limit?</strong></summary>
  Telegram limits individual files to **2 GB** (or 4 GB with Telegram Premium). There is no practical limit on the number of files. Most users never hit a cap.
</details>

<details>
  <summary><strong>Can I access my files from my phone?</strong></summary>
  Yes! Open Telegram on your phone, go to **Saved Messages** — all your files are there as document messages. The app is just a convenient way to manage them.
</details>

---

## Frequently Asked Questions

<details>
  <summary><strong>Who is this for?</strong></summary>
  Anyone who wants a free, private, unlimited cloud drive without trusting third-party services. Perfect for backing up documents, photos, and files between devices.
</details>

<details>
  <summary><strong>Can I share files with others?</strong></summary>
  Files in Saved Messages are private. To share, you can manually forward them from Telegram. A sharing feature may be added in future versions.
</details>

<details>
  <summary><strong>Why is the app slow with many files?</strong></summary>
  The file list comes from a local SQLite index, which is instant. Uploading/downloading depends on your internet speed and Telegram's servers (usually very fast).
</details>

<details>
  <summary><strong>I found a bug / have an idea</strong></summary>
  Open an [issue](https://github.com/HugoAleOlguin/Telegram-Drive/issues) or start a [discussion](https://github.com/HugoAleOlguin/Telegram-Drive/discussions). Contributions welcome!
</details>

---

## Build from Source (for Developers)

<details>
  <summary><strong>Click here if you want to compile the app yourself</strong></summary>

  ```powershell
  # Prerequisites: Node.js 18+, Rust stable, Git

  git clone https://github.com/HugoAleOlguin/Telegram-Drive.git
  cd Telegram-Drive
  npm install
  npm run tauri build
  npm run portable
  ```

  The portable `.zip` will be created at the project root.

</details>

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <br>
  <p>
    <a href="https://github.com/HugoAleOlguin">
      <img src="https://img.shields.io/badge/made_with_❤️_by-@HugoAleOlguin-3b82f6?style=for-the-badge" alt="Author">
    </a>
  </p>
  <p>
    <a href="https://github.com/HugoAleOlguin/Telegram-Drive/issues">Report Bug</a> •
    <a href="https://github.com/HugoAleOlguin/Telegram-Drive/discussions">Suggest Feature</a> •
    <a href="https://hugoaleolguin.github.io/">Portfolio</a>
  </p>
  <br>
  <sub>Telegram Drive is not affiliated with, endorsed by, or connected to Telegram Messenger LLP.</sub>
</div>
