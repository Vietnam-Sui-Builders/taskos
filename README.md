# TaskOS - Product Requirements Document (PRD)

[![Live Demo](https://img.shields.io/badge/Demo-Live-success?style=for-the-badge&logo=netlify)](https://task-os.netlify.app/)
[![Sui Network](https://img.shields.io/badge/Sui-Testnet-blue?style=for-the-badge&logo=sui)](https://suiexplorer.com/)

## 🎯 Project Overview

A decentralized task management system built on the Sui blockchain, featuring role-based access control, encrypted content storage via Walrus, and SUI token rewards. This project enables secure, collaborative task management with on-chain verification and incentivization mechanisms.

### Vision

Create a transparent, secure, and incentive-driven task management platform that leverages blockchain technology to ensure accountability, privacy, and fair compensation.

### 🚀 Live Deployment

- **Website:** [https://task-os.netlify.app/](https://task-os.netlify.app/)
- **Network:** Sui Testnet

### 📝 Testnet Contract Addresses

```bash
NEXT_PUBLIC_PACKAGE_ID=0x3217406cbbda5799dba5af7b4d3f62764e06b4f98cf9e972759ffadc015eec30
NEXT_PUBLIC_TASKS_REGISTRY_ID=0xa9ed5d827be92e111ba6d8af22a4184c1bce8cb8bc028de0cc17edcc17423641
NEXT_PUBLIC_VERSION_ID=0x1a9dcd1b540bd60f1efdabbba96990761fc68740b5eac9339706f267351e6e6f
```

**Explorer Links:**
- [Package on Sui Explorer](https://suiexplorer.com/object/0xd9a9971440976714e8b9fb6bc5f1aefbc9fca252612b1275c3e33d3c2774fec0?network=testnet)
- [Task Registry](https://suiexplorer.com/object/0xed26a9cf9f93ac8f017ecd9853a91de5238dc71fdcccb940ee8f5ee2b100c1c9?network=testnet)

---

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- Next.js 16 (React 19)
- TypeScript
- Tailwind CSS
- Radix UI Components
- TanStack Query for state management
- @mysten/dapp-kit for Sui integration

**Blockchain:**
- Sui Blockchain
- Move Smart Contracts
- Walrus Storage for encrypted content
- Seal Protocol for identity-based encryption

**Key Libraries:**
- @mysten/sui - Sui TypeScript SDK
- @mysten/walrus - Walrus storage integration
- @dnd-kit - Drag and drop functionality
- recharts - Data visualization

---

## 📋 Core Features

### 1. Task Management (CRUD Operations)

**1.1 Task Creation**
- **Fields:**
  - Title (required, max 200 chars)
  - Description (required, max 2000 chars)
  - Category (required, max 50 chars)
  - Tags (optional, max 10 tags, 30 chars each)
  - Priority (Low/Medium/High/Critical)
  - Due Date (optional)
  - Image URL (optional)
- **Technical:** Each task is an owned object on Sui blockchain
- **Registry:** Tasks are indexed by status in a shared TaskRegistry for efficient querying

**1.2 Task Updates**
- Update basic info (title, description)
- Change priority, status, category, due date
- Add/remove tags
- Archive tasks (soft delete)
- Delete tasks (hard delete, owner only)

**1.3 Task Status Workflow**
- **TODO** → **IN PROGRESS** → **COMPLETED** → **ARCHIVED**
- Status changes automatically update TaskRegistry indices
- Real-time sync across all collaborators

### 2. Role-Based Access Control (RBAC)

**2.1 Role Hierarchy**
- **Owner (Level 3):** Full control including deletion and access management
- **Editor (Level 2):** Can edit tasks and add comments
- **Viewer (Level 1):** Read-only access

**2.2 Access Management**
- Share tasks with multiple users
- Assign specific roles to collaborators
- Update or revoke user permissions
- Owner cannot be removed or demoted

### 3. Walrus Integration - Encrypted Content Storage

**3.1 Content Encryption**
- Upload encrypted task content to Walrus
- Store blob IDs on-chain
- Integrate with Seal protocol for IBE (Identity-Based Encryption)

**3.2 File Attachments**
- Support multiple file uploads
- Store encrypted file blob IDs
- Access control via blockchain verification

**3.3 Decryption Flow**
- Verify user access via smart contract
- Use Seal IBE for secure decryption
- Namespace-based access control

### 4. Comments System

**4.1 Comment Operations**
- Add comments (Editor+ access required)
- Edit own comments
- Delete comments (author or owner)
- Track comment creation and edit timestamps

**4.2 Comment Structure**
- Author address
- Content (max 1000 chars)
- Created timestamp
- Last edited timestamp

### 5. SUI Reward System

**5.1 Reward Deposit**
- Owners can deposit SUI tokens as task rewards
- Track individual depositor contributions
- Prevent deposits after task completion

**5.2 Assignee Management**
- Set task assignee
- Only one assignee per task
- Assignee eligible for reward upon completion

**5.3 Reward Distribution**
- Owner approves task completion
- Automatic reward transfer to assignee
- One-time approval (cannot re-approve)

**5.4 Refund Mechanism**
- Cancel task and refund all deposits
- Proportional refunds to all depositors
- Automatic refund on task deletion or archival

### 6. On-Chain Query System

**6.1 TaskRegistry**
- Shared object for indexing tasks by status
- Efficient on-chain queries for task discovery
- Status-based task lists

**6.2 Query Functions**
- Get tasks by status
- Count tasks by status
- Real-time updates via events

---

## 🔐 Security & Validation

### Input Validation
- String length limits enforced on-chain
- Priority and status value validation
- Role permission checks
- Prevent self-sharing and owner removal

### Access Control
- Permission checks on every mutation
- Creator always has owner privileges
- Dynamic field storage for access control lists

### Financial Security
- Balance tracking for deposits
- Prevent double-approval of rewards
- Refund mechanism for cancelled tasks
- Amount validation (no zero deposits)

---

## 🎨 User Interface Components

### Core Components
- **Task Manager:** Main dashboard with drag-and-drop
- **Task Cards:** Visual task representation
- **Create/Update Forms:** Task CRUD operations
- **Share Dialog:** Access management UI
- **Comments Section:** Threaded discussions
- **Reward Panel:** Deposit and approval interface
- **Walrus Upload:** Encrypted file management

### UI Features
- Dark mode support
- Responsive design
- Real-time updates
- Toast notifications
- Data tables with sorting/filtering

---

## 📊 Data Model

### Task Object
```typescript
{
  id: UID,
  creator: address,
  title: String,
  description: String,
  image_url: String,
  content_blob_id: Option<String>,
  file_blob_ids: vector<String>,
  created_at: u64,
  updated_at: u64,
  due_date: Option<u64>,
  priority: u8,
  status: u8,
  category: String,
  tags: vector<String>
}
```

### Dynamic Fields
- **AccessControl:** Role mappings
- **Comments:** Comment history
- **RewardBalance:** SUI token balance
- **Deposits:** Individual deposit tracking
- **Assignee:** Task assignee address
- **CompletionApproved:** Approval status

---

## 🚀 Getting Started

### Prerequisites
1. Node.js 20+
2. pnpm (recommended)
3. Sui Wallet (for blockchain interactions)
4. Sui CLI (for Move contract deployment)

### Environment Setup

1. **Copy environment template:**
```bash
cp .env.example .env.local
```

2. **Configure environment variables:**
```env
NEXT_PUBLIC_PACKAGE_ID=<your_package_id>
NEXT_PUBLIC_VERSION_ID=<your_version_object_id>
NEXT_PUBLIC_TASK_REGISTRY_ID=<your_task_registry_id>
```

See [SETUP.md](./SETUP.md) for detailed deployment instructions.

### Development Server

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deploy Move Contracts

```bash
cd move/task_manage
sui move build
sui client publish --gas-budget 100000000
```

### Run Tests

```bash
# Move contract tests
cd move/task_manage
sui move test

# TypeScript E2E tests
pnpm test
```

---

## 🧪 Testing

### Move Contract Tests
- Access control tests
- CRUD operation tests
- Reward system tests
- Walrus integration tests

### E2E Tests
- Task creation workflow
- Comment system
- Update operations
- Access sharing

---

## 📦 Project Structure

```
├── app/                    # Next.js app directory
│   ├── dashboard/         # Main dashboard
│   ├── login/            # Authentication
│   └── walrus/           # Walrus integration demo
├── components/            # React components
│   ├── task-manager/     # Task management components
│   └── ui/              # Reusable UI components
├── move/                 # Sui Move contracts
│   └── task_manage/
│       ├── sources/      # Move source files
│       └── tests/       # Move tests
├── e2e/                  # End-to-end tests
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries
└── types/              # TypeScript type definitions
```

---

## 🔄 Workflows

### Task Creation Flow
1. User connects wallet
2. Fills task form with required fields
3. Transaction submitted to blockchain
4. Task object created and assigned to user
5. Task indexed in TaskRegistry
6. TaskCreated event emitted

### Collaboration Flow
1. Owner shares task with collaborators
2. Assigns appropriate roles (Viewer/Editor/Owner)
3. Collaborators can view/edit based on permissions
4. Comments and updates sync on-chain
5. Access can be revoked by owner

### Reward Flow
1. Owner deposits SUI reward into task
2. Owner assigns task to user
3. Assignee completes work
4. Assignee updates status to COMPLETED
5. Owner approves completion
6. Reward automatically transferred to assignee

---

## 🎯 Use Cases

1. **Freelance Work:** Escrow-based task completion with automatic payments
2. **Team Projects:** Collaborative task management with role-based access
3. **Bounty Programs:** Public tasks with SUI rewards
4. **Project Management:** Secure, transparent task tracking
5. **DAO Operations:** Decentralized task assignment and compensation

---

## 🔮 Future Enhancements

- [ ] Multi-assignee support
- [ ] Milestone-based payments
- [ ] Task templates
- [ ] Advanced search and filtering
- [ ] Mobile app
- [ ] Integration with more wallets
- [ ] NFT-based task achievements
- [ ] Reputation system
- [ ] Task dependencies and sub-tasks
- [ ] Calendar view and notifications

---

## 📚 Documentation

- [Setup Guide](./SETUP.md) - Detailed environment configuration
- [Move Contract Documentation](./move/task_manage/readme.md) - Smart contract details
- [Sui Documentation](https://docs.sui.io/) - Sui blockchain docs
- [Walrus Documentation](https://docs.walrus.site/) - Walrus storage docs

---

## 👥 Collaborators

This project was built by:

<table>
<tr>
<td align="center">
<a href="https://github.com/longphu25">
<img src="https://github.com/longphu25.png" width="100px;" alt="Huỳnh Long Phú"/><br />
<sub><b>Huỳnh Long Phú</b></sub>
</a><br />
<a href="https://t.me/longphu">💬 Telegram</a><br />
<a href="mailto:longphu257@gmail.com">📧 Email</a>
</td>
<td align="center">
<a href="https://github.com/teededung">
<img src="https://github.com/teededung.png" width="100px;" alt="Nguyễn Tuấn Anh"/><br />
<sub><b>Nguyễn Tuấn Anh</b></sub>
</a><br />
<a href="https://t.me/rongmauhong">💬 Telegram</a><br />
<a href="mailto:rongmauhong@protonmail.com">📧 Email</a>
</td>
<td align="center">
<a href="https://github.com/tpSpace">
<img src="https://github.com/tpSpace.png" width="100px;" alt="Nguyễn Mạnh Việt Khôi"/><br />
<sub><b>Nguyễn Mạnh Việt Khôi</b></sub>
</a><br />
<a href="https://t.me/Rocky2077">💬 Telegram</a><br />
<a href="mailto:nmvkhoi@gmail.com">📧 Email</a>
</td>
</tr>
<tr>
<td align="center">
<a href="https://github.com/tuanhqv123">
<img src="https://github.com/tuanhqv123.png" width="100px;" alt="Trần Anh Tuấn"/><br />
<sub><b>Trần Anh Tuấn</b></sub>
</a><br />
<a href="https://t.me/tuanhqv123">💬 Telegram</a><br />
<a href="mailto:tuantrungvuongk62@gmail.com">📧 Email</a>
</td>
<td align="center">
<a href="https://github.com/lamdanghoang">
<img src="https://github.com/lamdanghoang.png" width="100px;" alt="Đặng Hoàng Lâm"/><br />
<sub><b>Đặng Hoàng Lâm</b></sub>
</a><br />
<a href="https://t.me/danghlam">💬 Telegram</a><br />
<a href="mailto:danghlambk14@gmail.com">📧 Email</a>
</td>
<td></td>
</tr>
</table>

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is built for hackathon purposes. Please check with the repository owner for licensing details.

---

## 🆘 Support

For setup issues, see [SETUP.md](./SETUP.md) troubleshooting section.

For bugs or feature requests, please open an issue on GitHub.

---

Built with ❤️ on Sui Blockchain

