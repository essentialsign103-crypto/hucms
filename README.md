# HU CMS - Clinic Management System

A modern, web-based clinic management system built with vanilla JavaScript, HTML, and CSS.

## Features

### 🏥 Core Modules
- **Patients**: Register and manage patient profiles with medical history
- **Doctors**: Manage doctor profiles, specializations, and availability
- **Appointments**: Schedule and track patient appointments
- **Medical Records**: Document diagnoses, symptoms, and vital signs
- **Prescriptions**: Issue and track medications
- **Treatments**: Create and monitor treatment plans
- **Staff**: Manage clinic staff and user accounts

### 👥 Role-Based Access Control
- **Admin**: Full system access and staff management
- **Doctor**: View only their assigned patients and appointments, write referrals
- **Receptionist**: Manage patient flow, reassign patients to specialists, view all data
- **Patient**: View own appointments and medical records (future feature)

### 🔄 Clinic Workflow
1. **Patient Registration** - Receptionist registers new patients
2. **Appointment Booking** - Receptionist assigns patients to doctors
3. **Consultation** - Doctor examines patient and writes medical record
4. **Referral** - Doctor can refer patient to specialist if needed
5. **Reassignment** - Receptionist reassigns to appropriate specialist
6. **Prescription** - Doctor writes prescription for patient
7. **Treatment** - Doctor creates treatment plan with progress tracking

### 📋 Key Features
- **Referral System**: Doctors can refer patients to specialists with specific reasons
- **Patient History**: Track all doctors who have treated a patient
- **PDF Export**: Download complete patient records as PDF
- **Real-time Data**: All data stored in browser localStorage
- **Responsive Design**: Works on desktop and tablet devices
- **Professional UI**: Clean, modern interface with Insaniburg serif font for clinical text

## Technology Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Storage**: Browser localStorage (swap-ready for Firebase)
- **PDF Generation**: html2pdf.js library
- **Fonts**: Inter (UI), Insaniburg (clinical text)

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No server or database required

### Installation
1. Clone the repository
```bash
git clone https://github.com/yourusername/hu-cms.git
cd hu-cms
```

2. Open in browser
```bash
# Option 1: Direct file access
open index.html

# Option 2: Using local server (recommended)
npx serve . -p 3000
```

3. Login with demo credentials
- **Admin**: hamza@gmail.com / admin123
- **Doctor**: doctor@gmail.com / doctor123
- **Receptionist**: reception@gmail.com / recep123

## Demo Data
The system comes with pre-loaded demo data:
- 5 Staff members (Admin, Doctors, Receptionists)
- 5 Doctors with different specializations
- 8 Patients with medical histories
- 10 Appointments
- 5 Medical records
- 5 Prescriptions
- 5 Treatment plans

## File Structure
```
hu-cms/
├── index.html              # Dashboard
├── patients.html           # Patient management
├── doctors.html            # Doctor management
├── appointments.html       # Appointment scheduling
├── records.html            # Medical records
├── prescriptions.html      # Prescription management
├── treatments.html         # Treatment plans
├── staff.html              # Staff management
├── login.html              # Login page
├── css/
│   ├── main.css           # Main styles
│   └── components.css      # Component styles
├── js/
│   ├── app.js             # Main app logic
│   ├── auth.js            # Authentication
│   ├── storage.js         # Data storage layer
│   ├── appointments.js    # Appointments module
│   ├── records.js         # Medical records module
│   ├── prescriptions.js   # Prescriptions module
│   ├── treatments.js      # Treatments module
│   ├── patients.js        # Patients module
│   ├── doctors.js         # Doctors module
│   ├── staff.js           # Staff module
│   ├── dashboard.js       # Dashboard module
│   └── login-page.js      # Login page logic
├── favicon.png            # App icon
└── README.md              # This file
```

## Usage

### For Receptionists
1. Login as receptionist
2. Go to **Patients** → Register new patients
3. Go to **Appointments** → Assign patients to doctors
4. Monitor referrals in **Medical Records**
5. When referral received → Click "Reassign to Specialist"
6. Select appropriate doctor and create new appointment

### For Doctors
1. Login as doctor
2. View only your assigned patients and appointments
3. Create medical records with diagnosis
4. If patient needs specialist → Check "Refer to Specialist"
5. Specify referral reason (e.g., "Needs Cardiology")
6. Write prescriptions and treatment plans

### For Admin
1. Login as admin
2. Access all modules and data
3. Manage staff accounts in **Staff** page
4. Create new admin accounts

## Features in Detail

### Referral System
- Doctors can mark records as referrals
- Specify required specialization
- Receptionists see referral alerts
- One-click reassignment to specialist
- Automatic appointment creation

### Patient PDF Export
- Download complete patient record
- Includes: demographics, appointments, medical records, prescriptions, treatments
- Professional formatting with clinic branding

### Role-Based Filtering
- **Doctors**: See only their patients and appointments
- **Receptionists**: See all patients and appointments
- **Admin**: See all data

## Future Enhancements
- [ ] Patient login portal
- [ ] Email notifications
- [ ] SMS reminders
- [ ] Billing and invoicing
- [ ] Inventory management
- [ ] Analytics dashboard
- [ ] Multi-clinic support
- [ ] Mobile app

## Data Storage
Currently uses browser localStorage. To migrate to a backend:
1. Replace Storage module with API calls
2. Add backend server (Node.js, Python, etc.)
3. Add database (MongoDB, PostgreSQL, etc.)
4. Implement authentication tokens

## Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License
MIT License - feel free to use and modify

## Support
For issues or questions, please create an issue on GitHub.

## Author
HU CMS Development Team

---

**Note**: This is a demo/educational system. For production use, implement proper security measures, backend validation, and database persistence.
