const flat = {
  'nav.register': 'Register',
  'nav.myPurchases': 'My Purchases',
  'nav.marianita': 'Marianita',
  'app.recordTitle': "Record today's snacks",
  'app.historyTitle': 'Your history',
  'app.panelTitle': "Marianita's accounts",
  'picker.whoAreYou': 'Who are you?',
  'picker.registerTitle': 'Register',
  'picker.noOneYet': 'No one registered yet.',
  'picker.iAmNew': "I'm new, sign me up",
  'picker.employeeNumber': 'Employee number',
  'picker.yourName': 'Your name',
  'picker.phone': 'Phone',
  'picker.empPlaceholder': 'e.g. 31000376',
  'picker.namePlaceholder': 'e.g. Maria Lopez',
  'picker.phonePlaceholder': 'e.g. 3001234567',
  'picker.registerBtn': 'Register me',
  'picker.back': '← Back',
  'picker.errEmployee': 'Enter your employee number',
  'picker.errName': 'Enter your name',
  'picker.errPhone': 'Enter a valid phone number (10 digits)',
  'picker.errIdTaken': 'That ID is already registered',
  'pin.title': "Marianita's Panel",
  'pin.subtitle': 'Enter PIN to continue',
  'pin.incorrect': 'Incorrect PIN, try again',
  'pin.enter': 'Enter',
  'register.title': 'What are you having today, {{name}}?',
  'register.subtitle': 'Choose the product(s) you want',
  'register.searchPlaceholder': 'Search products…',
  'register.noResults': 'No results',
  'register.noResultsDesc': 'No products match "{{query}}"',
  'register.howPaid': 'How did you pay?',
  'register.cash': 'Cash',
  'register.transfer': 'Transfer',
  'register.recordBtn': 'Record purchase',
  'register.done': 'Done!',
  'register.recorded': 'Recorded, {{name}} 🍬',
  'register.confirmTitle': 'Confirm purchase',
  'register.confirmBtn': 'Confirm purchase',
  'register.review': 'Review',
  'register.total': 'Total',
  'myPurchases.title': 'Your Purchases',
  'myPurchases.owedTo': 'You owe Marianita',
  'myPurchases.count_one': '{{count}} purchase',
  'myPurchases.count_other': '{{count}} purchases',
  'myPurchases.inTotal': 'total',
  'myPurchases.inCash': 'cash',
  'myPurchases.inTransfer': 'transfer',
  'myPurchases.all': 'All',
  'myPurchases.cash': 'Cash',
  'myPurchases.transfer': 'Transfer',
  'myPurchases.emptyTitle': 'Nothing yet',
  'myPurchases.emptyDesc': 'Treat yourself 🍬',
  'panel.title': "Marianita's Panel",
  'panel.today': 'Today',
  'panel.thisWeek': 'This week',
  'panel.thisMonth': 'This month',
  'panel.all': 'All',
  'panel.totalToday': "Today's total",
  'panel.totalWeek': "This week's total",
  'panel.totalMonth': "This month's total",
  'panel.totalAll': 'All-time total',
  'panel.cash': 'Cash',
  'panel.transfer': 'Transfer',
  'panel.whoOwes': 'Who owes',
  'panel.products': 'Products',
  'panel.upToDate': 'All up to date',
  'panel.noDebts': 'No one owes anything this period.',
  'panel.person': 'Person',
  'panel.purchases': 'Purchases',
  'panel.owes': 'Owes',
  'panel.count_one': '{{count}} purchase',
  'panel.count_other': '{{count}} purchases',
  'panel.available': 'Available',
  'panel.soldOut': 'Sold out',
  'panel.save': 'Save',
  'panel.cancel': 'Cancel',
  'panel.productName': 'Product name',
  'panel.price': 'Price',
  'panel.add': 'Add',
  'panel.addProduct': 'Add product',
  'dates.today': 'Today',
  'dates.yesterday': 'Yesterday',
  'dates.daysAgo_one': '{{count}} day ago',
  'dates.daysAgo_other': '{{count}} days ago',
}

function t(key, opts) {
  let resolvedKey = key
  if (opts?.count !== undefined) {
    const suffix = opts.count === 1 ? '_one' : '_other'
    if (flat[key + suffix] !== undefined) resolvedKey = key + suffix
  }
  let str = flat[resolvedKey] ?? key
  if (opts) {
    Object.entries(opts).forEach(([k, v]) => {
      str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v))
    })
  }
  return str
}

export const useTranslation = vi.fn(() => ({
  t,
  i18n: { language: 'en', changeLanguage: vi.fn() },
}))

export const initReactI18next = { type: '3rdParty', init: vi.fn() }
