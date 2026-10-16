export type SupportedLang = 'en' | 'ur' | 'ar';

export type TranslationMap = {
  langName: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
  searchPlaceholder: string;
  allCategories: string;
  specials: string;
  threeDModels: string;
  vegetarian: string;
  halal: string;
  spicy: string;
  glutenFree: string;
  viewIn3D: string;
  viewInAR: string;
  arInstruction: string;
  orderViaWhatsApp: string;
  orderForTable: string;
  soldOut: string;
  service: string;
  share: string;
  wifi: string;
  addToOrder: string;
  viewOrder: string;
  yourOrder: string;
  table: string;
  clearOrder: string;
  sendWhatsAppOrder: string;
  total: string;
  specialInstructions: string;
  instructionsPlaceholder: string;
  noDishesFound: string;
  noDishesDesc: string;
  clearFilters: string;
  callServer: string;
  requestWater: string;
  requestBill: string;
  tableServiceTitle: string;
  tableServiceDesc: string;
  wifiTitle: string;
  wifiDesc: string;
  copyPassword: string;
  copied: string;
  featuredBadge: string;
  arBadge: string;
  tryOnYourTable: string;
};

export const TRANSLATIONS: Record<SupportedLang, TranslationMap> = {
  en: {
    langName: 'English',
    nativeName: 'English',
    dir: 'ltr',
    searchPlaceholder: 'Search dishes, dietary tags or ingredients…',
    allCategories: 'All',
    specials: 'Specials',
    threeDModels: '3D & AR',
    vegetarian: 'Vegetarian',
    halal: 'Halal',
    spicy: 'Spicy',
    glutenFree: 'Gluten-Free',
    viewIn3D: 'View in 3D',
    viewInAR: 'View on table in AR',
    arInstruction: 'Place the lifelike 3D dish right on your table before ordering',
    orderViaWhatsApp: 'Order via WhatsApp',
    orderForTable: 'Order for Table',
    soldOut: 'Sold out today',
    service: 'Service',
    share: 'Share',
    wifi: 'Wi-Fi',
    addToOrder: 'Add to Order',
    viewOrder: 'View Order',
    yourOrder: 'Your Table Order',
    table: 'Table',
    clearOrder: 'Clear all',
    sendWhatsAppOrder: 'Send Order via WhatsApp',
    total: 'Total',
    specialInstructions: 'Special culinary requests or allergy notes',
    instructionsPlaceholder: 'e.g. dressing on the side, extra crispy, no garlic…',
    noDishesFound: 'No dishes found',
    noDishesDesc: 'Try adjusting your search terms or dietary filter.',
    clearFilters: 'Show all dishes',
    callServer: 'Call Server',
    requestWater: 'Request Water',
    requestBill: 'Request Bill',
    tableServiceTitle: 'Table Service Assistance',
    tableServiceDesc: 'Send a quick message to our floor staff via WhatsApp.',
    wifiTitle: 'Guest Wi-Fi Access',
    wifiDesc: 'Connect to our high-speed guest network.',
    copyPassword: 'Copy Wi-Fi Password',
    copied: 'Copied!',
    featuredBadge: 'Chef Highlight',
    arBadge: '3D AR Experience',
    tryOnYourTable: 'Try this on your table'
  },
  ur: {
    langName: 'Urdu',
    nativeName: 'اردو',
    dir: 'rtl',
    searchPlaceholder: 'کھانے، اجزاء یا غذائی ترجیحات تلاش کریں…',
    allCategories: 'تمام کھانے',
    specials: 'خاص ڈشز',
    threeDModels: 'تھری ڈی اور اے آر',
    vegetarian: 'سبزی خور',
    halal: 'حلال',
    spicy: 'تیکھا / مصالحہ دار',
    glutenFree: 'گلوٹین فری',
    viewIn3D: 'تھری ڈی میں دیکھیں',
    viewInAR: 'اپنی ٹیبل پر AR میں دیکھیں',
    arInstruction: 'آرڈر کرنے سے پہلے اپنی میز پر اصلی سائز کا تھری ڈی کھانا پروجیکٹ کریں',
    orderViaWhatsApp: 'واٹس ایپ پر آرڈر کریں',
    orderForTable: 'ٹیبل کے لیے آرڈر',
    soldOut: 'آج ختم ہو چکا ہے',
    service: 'سروس',
    share: 'شیئر',
    wifi: 'وائی فائی',
    addToOrder: 'آرڈر میں شامل کریں',
    viewOrder: 'آرڈر دیکھیں',
    yourOrder: 'آپ کا آرڈر',
    table: 'ٹیبل',
    clearOrder: 'سب ختم کریں',
    sendWhatsAppOrder: 'واٹس ایپ کے ذریعے آرڈر بھیجیں',
    total: 'کل رقم',
    specialInstructions: 'خصوصی ہدایات یا الرجی کی تفصیل',
    instructionsPlaceholder: 'مثلاً: کم مصالحہ، پیاز کے بغیر، کرسپی…',
    noDishesFound: 'کوئی ڈش نہیں ملی',
    noDishesDesc: 'براہ کرم اپنی تلاش کے الفاظ یا فلٹر تبدیل کریں۔',
    clearFilters: 'تمام ڈشز دکھائیں',
    callServer: 'ویٹر کو بلائیں',
    requestWater: 'پانی طلب کریں',
    requestBill: 'بل منگوائیں',
    tableServiceTitle: 'ٹیبل سروس معاونت',
    tableServiceDesc: 'واٹس ایپ کے ذریعے ہمارے عملے کو فوراً مطلع کریں۔',
    wifiTitle: 'مہمانوں کا وائی فائی',
    wifiDesc: 'ہمارے تیز رفتار نیٹ ورک سے مفت جڑیں۔',
    copyPassword: 'پاس ورڈ کاپی کریں',
    copied: 'کاپی ہو گیا!',
    featuredBadge: 'شیف کا خاص انتخاب',
    arBadge: 'تھری ڈی تجربہ',
    tryOnYourTable: 'اسے اپنی ٹیبل پر دیکھیں'
  },
  ar: {
    langName: 'Arabic',
    nativeName: 'العربية',
    dir: 'rtl',
    searchPlaceholder: 'ابحث عن الأطباق، المكونات، أو التفضيلات الغذائية…',
    allCategories: 'الكل',
    specials: 'المميزة',
    threeDModels: 'ثلاثي الأبعاد والواقع المعزز',
    vegetarian: 'نباتي',
    halal: 'حلال',
    spicy: 'حار',
    glutenFree: 'خالٍ من الغلوتين',
    viewIn3D: 'عرض ثلاثي الأبعاد',
    viewInAR: 'عرض في الواقع المعزز على طاولتك',
    arInstruction: 'استعرض الطبق بحجمه الحقيقي ثلاثي الأبعاد على طاولتك قبل الطلب',
    orderViaWhatsApp: 'الطلب عبر واتساب',
    orderForTable: 'طلب للطاولة',
    soldOut: 'غير متوفر اليوم',
    service: 'خدمة',
    share: 'مشاركة',
    wifi: 'واي فاي',
    addToOrder: 'إضافة إلى الطلب',
    viewOrder: 'عرض الطلب',
    yourOrder: 'طلبك الحالي',
    table: 'طاولة',
    clearOrder: 'مسح الكل',
    sendWhatsAppOrder: 'إرسال الطلب عبر واتساب',
    total: 'المجموع الإجمالي',
    specialInstructions: 'ملاحظات خاصة بالطهي أو الحساسية',
    instructionsPlaceholder: 'مثال: الصلصة جانباً، مقرمش إضافي، بدون بصل…',
    noDishesFound: 'لم يتم العثور على أطباق',
    noDishesDesc: 'يرجى تجربة كلمات بحث أخرى أو تعديل التصفية.',
    clearFilters: 'عرض جميع الأطباق',
    callServer: 'استدعاء النادل',
    requestWater: 'طلب ماء',
    requestBill: 'طلب الفاتورة',
    tableServiceTitle: 'خدمة الطاولة السريعة',
    tableServiceDesc: 'أرسل طلباً فورياً إلى طاقم الخدمة عبر واتساب.',
    wifiTitle: 'واي فاي الضيوف',
    wifiDesc: 'اتصل بشبكة الواي فاي عالية السرعة المخصصة للضيوف.',
    copyPassword: 'نسخ كلمة المرور',
    copied: 'تم النسخ!',
    featuredBadge: 'اختيار الشيف',
    arBadge: 'تجربة ثلاثية الأبعاد',
    tryOnYourTable: 'جرّب هذا على طاولتك'
  }
};

/**
 * Returns localized dish name with intelligent fallback to default English name.
 */
export function getDishName(
  item: { name: string; nameUr?: string | null; nameAr?: string | null },
  lang: SupportedLang
): string {
  if (lang === 'ur' && item.nameUr?.trim()) return item.nameUr.trim();
  if (lang === 'ar' && item.nameAr?.trim()) return item.nameAr.trim();
  return item.name;
}

/**
 * Returns localized dish description with intelligent fallback to default English description.
 */
export function getDishDescription(
  item: { description?: string | null; descriptionUr?: string | null; descriptionAr?: string | null },
  lang: SupportedLang
): string {
  if (lang === 'ur' && item.descriptionUr?.trim()) return item.descriptionUr.trim();
  if (lang === 'ar' && item.descriptionAr?.trim()) return item.descriptionAr.trim();
  return item.description || '';
}
