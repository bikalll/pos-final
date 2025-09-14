# Arbi POS - Restaurant Management System

A comprehensive React Native Point of Sale (POS) application designed for restaurants and food service businesses. Built with modern UI/UX principles and full printing functionality.

## 🎨 Features

### Core Functionality
- **Table Management**: Manage restaurant tables with real-time status updates
- **Order Processing**: Complete order taking, management, and tracking
- **Receipt Generation**: Professional receipt printing and management
- **Kitchen Tickets**: Generate and print kitchen order tickets
- **Payment Processing**: Multiple payment method support
- **Inventory Management**: Track stock levels and manage items
- **Staff Management**: Employee attendance and role management
- **Reporting**: Comprehensive sales and business reports

### Printing System (Critical Feature)
- **Receipt Printing**: Professional formatted receipts with itemized details
- **Kitchen Tickets**: Clear kitchen order tickets for food preparation
- **Report Generation**: Detailed business reports in printable format
- **Bluetooth Support**: Connect to wireless Bluetooth printers
- **USB Support**: Direct USB printer connectivity
- **PDF Export**: Export documents for sharing and archiving
- **Multiple Formats**: Support for various receipt and ticket layouts

### User Interface
- **Dark Theme**: Modern dark UI design for better visibility
- **Responsive Design**: Optimized for various screen sizes
- **Intuitive Navigation**: Easy-to-use tab-based navigation
- **Professional Branding**: Arbi POS branding with orange accent colors

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- React Native development environment
- Expo CLI
- Android Studio / Xcode (for device testing)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rn-pos
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on device/emulator**
   ```bash
   # Android
   npm run android
   
   # iOS
   npm run ios
   
   # Web
   npm run web
   ```

## 📱 App Structure

### Screens
- **Login Screen**: User authentication with role-based access
- **Tables Dashboard**: Main table management interface
- **Order Management**: Process and track customer orders
- **Receipts**: View and manage transaction receipts
- **Printer Setup**: Configure printing devices
- **Settings**: System configuration and preferences

### Components
- **Sidebar Navigation**: Main app navigation menu
- **Table Cards**: Individual table management cards
- **Print Demo**: Testing interface for printing functionality
- **Payment Summary**: Daily transaction overview

### Services
- **Printing Service**: Core printing functionality
- **Database Service**: Local data management
- **API Service**: External data integration
- **Hardware Service**: Device connectivity

## 🖨️ Printing Features

### Receipt Printing
```typescript
import { printReceipt } from '../services/printing';

const receiptData = {
  receiptId: 'RCPT-001',
  customerName: 'John Doe',
  items: [...],
  total: 45.50,
  // ... other receipt details
};

await printReceipt(receiptData);
```

### Kitchen Tickets
```typescript
import { printKitchenTicket } from '../services/printing';

const ticketData = {
  ticketId: 'TKT-001',
  tableNumber: '3',
  items: [...],
  estimatedTime: '25 minutes',
  // ... other ticket details
};

await printKitchenTicket(ticketData);
```

### Reports
```typescript
import { printReport } from '../services/printing';

const reportData = {
  title: 'Daily Sales Report',
  date: '2024-01-15',
  data: {...},
  summary: {...},
};

await printReport(reportData);
```

## 🔧 Configuration

### Printer Setup
1. Navigate to Settings → Printer Setup
2. Choose connection method (Bluetooth or USB)
3. Follow on-screen instructions for device pairing
4. Test printing with sample documents

### App Configuration
- Update `app.json` for app-specific settings
- Configure database connections in `src/services/db.ts`
- Set up API endpoints in `src/services/api.ts`

## 📊 Data Management

### Local Storage
- SQLite database for offline functionality
- AsyncStorage for user preferences
- File system for document storage

### Data Sync
- Real-time order updates
- Offline data synchronization
- Backup and restore functionality

## 🎯 Business Logic

### Order Processing
1. **Table Selection**: Choose available table
2. **Item Selection**: Add menu items to order
3. **Order Review**: Verify items and quantities
4. **Payment Processing**: Handle customer payment
5. **Receipt Generation**: Print customer receipt
6. **Kitchen Ticket**: Generate food preparation ticket

### Table Management
- **Available**: Ready for new orders
- **Occupied**: Currently serving customers
- **Reserved**: Booked for future use
- **Cleaning**: Undergoing maintenance

## 🚨 Troubleshooting

### Common Issues

**Printing Problems**
- Ensure Bluetooth is enabled
- Check printer is in pairing mode
- Verify device permissions
- Test with sample documents first

**Navigation Issues**
- Clear app cache
- Restart development server
- Check navigation dependencies

**Performance Issues**
- Optimize image assets
- Reduce bundle size
- Monitor memory usage

### Support
- Check the troubleshooting section in Printer Setup
- Review console logs for error details
- Test on different devices/emulators

## 🔒 Security Features

- Role-based access control
- Secure authentication
- Data encryption
- Permission management

## 📈 Performance Optimization

- Lazy loading of components
- Efficient state management
- Optimized image rendering
- Minimal re-renders

## 🧪 Testing

### Manual Testing
- Test all printing functions
- Verify navigation flows
- Check responsive design
- Test offline functionality

### Automated Testing
- Unit tests for services
- Component testing
- Integration testing
- E2E testing

## 📱 Platform Support

- **Android**: Full support with native features
- **iOS**: Full support with native features
- **Web**: Limited functionality (no hardware access)

## 🔄 Updates & Maintenance

### Regular Updates
- Security patches
- Bug fixes
- Feature enhancements
- Performance improvements

### Version History
- v1.0.0: Initial release with core functionality
- Future versions: Enhanced features and optimizations

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- React Native community
- Expo team for excellent tooling
- Contributors and testers
- Restaurant industry feedback

## 📞 Support

For technical support or feature requests:
- Create an issue in the repository
- Contact the development team
- Check documentation and FAQs

---

**Arbi POS** - Empowering restaurants with modern technology solutions.
