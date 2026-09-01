import type { Locale } from '../../i18n'
import type { CanonicalField } from '../../lib/localisationImport'
import type { LocalisationEntityType } from '../../lib/localisationImportApi'

type LocalisationImportCopy = {
  title: string
  intro: string
  securityNote: string
  uploadTitle: string
  uploadText: string
  chooseFile: string
  replaceFile: string
  supportedFiles: string
  limits: string
  legacyXls: string
  selectedFile: string
  sheets: string
  selectSheet: string
  entityType: string
  detectedColumns: string
  mappingTitle: string
  mappingText: string
  fieldLabels: Record<CanonicalField, string>
  entityLabels: Record<LocalisationEntityType, string>
  ignoreColumn: string
  required: string
  optional: string
  previewTitle: string
  previewText: string
  emptyPreview: string
  sourceRow: string
  dryRun: string
  validating: string
  apply: string
  applying: string
  confirmTitle: string
  confirmWarning: string
  cancel: string
  close: string
  summaryTitle: string
  totalRows: string
  validRows: string
  invalidRows: string
  duplicateRows: string
  appliedRows: string
  insertedRows: string
  updatedRows: string
  skippedRows: string
  errorRowsTitle: string
  noRowErrors: string
  row: string
  error: string
  historyTitle: string
  historyText: string
  emptyHistory: string
  file: string
  sheet: string
  status: string
  createdAt: string
  completedAt: string
  loading: string
  refresh: string
  retry: string
  parseFailed: string
  importFailed: string
  importSucceeded: string
  unavailable: string
  notConnected: string
  accessDenied: string
  mappingMissing: string
  formulaWarning: string
  formulasIgnored: string
  noFile: string
  statuses: Record<string, string>
}

export const localisationImportCopy: Record<Locale, LocalisationImportCopy> = {
  fr: {
    title: 'Import de localisation',
    intro: 'Analysez, mappez et validez les données Excel avant toute écriture définitive.',
    securityNote: 'Le fichier reste dans ce navigateur. Seules les lignes mappées sont envoyées aux RPC sécurisées du Super Admin.',
    uploadTitle: '1. Fichier source',
    uploadText: 'Choisissez un classeur XLSX ou un CSV. Les formules ne sont jamais exécutées.',
    chooseFile: 'Choisir un fichier', replaceFile: 'Remplacer le fichier',
    supportedFiles: 'Formats : .xlsx et .csv', limits: '5 Mo maximum · 10 000 lignes · 32 colonnes',
    legacyXls: 'Les anciens fichiers .xls ne sont pas pris en charge. Convertissez-les en .xlsx.',
    selectedFile: 'Fichier sélectionné', sheets: 'Feuilles détectées', selectSheet: 'Feuille à importer',
    entityType: 'Type de donnée', detectedColumns: 'Colonnes détectées',
    mappingTitle: '2. Correspondance des champs',
    mappingText: 'La détection automatique aide au démarrage. Vérifiez chaque champ générique « Field N » avant la validation.',
    fieldLabels: {
      name: 'Nom exact', name_fr: 'Nom français', name_ar: 'Nom arabe', name_en: 'Nom anglais',
      category: 'Catégorie', address: 'Adresse', wilaya: 'Wilaya', phone: 'Téléphone',
      opening_status: 'Statut / horaires', amenities: 'Équipements', source_url: 'URL source',
      latitude: 'Latitude', longitude: 'Longitude',
    },
    entityLabels: { establishment: 'Établissement / lieu', wilaya: 'Wilaya', moughataa: 'Moughataa', commune: 'Commune', locality: 'Localité' },
    ignoreColumn: 'Ne pas importer', required: 'obligatoire', optional: 'facultatif',
    previewTitle: '3. Aperçu', previewText: 'Les cinq premières lignes sont affichées comme texte brut.', emptyPreview: 'Aucune ligne exploitable dans cette feuille.', sourceRow: 'Ligne source',
    dryRun: 'Valider à blanc', validating: 'Validation…', apply: 'Importer définitivement', applying: 'Importation…',
    confirmTitle: 'Confirmer l’importation',
    confirmWarning: 'Cette action ajoutera ou mettra à jour les données de localisation. Vérifiez les erreurs avant de continuer.',
    cancel: 'Annuler', close: 'Fermer',
    summaryTitle: 'Résumé de validation', totalRows: 'Lignes détectées', validRows: 'Lignes valides', invalidRows: 'Lignes invalides', duplicateRows: 'Doublons / correspondances', appliedRows: 'Lignes appliquées', insertedRows: 'Lignes ajoutées', updatedRows: 'Lignes complétées', skippedRows: 'Lignes sans modification',
    errorRowsTitle: 'Erreurs par ligne', noRowErrors: 'Aucune erreur de ligne.', row: 'Ligne', error: 'Erreur',
    historyTitle: 'Historique des imports', historyText: 'Derniers lots traités par les Super Admins.', emptyHistory: 'Aucun import enregistré.',
    file: 'Fichier', sheet: 'Feuille', status: 'Statut', createdAt: 'Créé le', completedAt: 'Terminé le',
    loading: 'Chargement…', refresh: 'Actualiser', retry: 'Réessayer', parseFailed: 'Impossible de lire ce fichier.', importFailed: 'L’opération d’import a échoué.', importSucceeded: 'Les données de localisation ont été importées.', unavailable: 'Service momentanément indisponible.', notConnected: 'La migration d’import n’est pas encore connectée.', accessDenied: 'Accès Super Admin requis.', mappingMissing: 'Le champ « Nom exact » doit être associé à une colonne.',
    formulaWarning: 'Ce fichier contient des formules.', formulasIgnored: 'Les formules sans résultat scalaire enregistré ont été ignorées.', noFile: 'Choisissez un fichier avant de continuer.',
    statuses: { created: 'Créé', staging: 'Préparation', draft: 'Brouillon', staged: 'Préparé', validating: 'Validation', validated: 'Validé', invalid: 'Invalide', applying: 'Application', applied: 'Importé', expired: 'Expiré', failed: 'Échec' },
  },
  ar: {
    title: 'استيراد بيانات المواقع',
    intro: 'حلّل حقول ملف Excel وطابقها وتحقق منها قبل أي كتابة نهائية.',
    securityNote: 'يبقى الملف في هذا المتصفح. لا تُرسل إلا الحقول المطابقة عبر وظائف المدير الأعلى الآمنة.',
    uploadTitle: '1. الملف المصدر', uploadText: 'اختر ملف XLSX أو CSV. لا يتم تشغيل الصيغ مطلقاً.',
    chooseFile: 'اختيار ملف', replaceFile: 'استبدال الملف', supportedFiles: 'الصيغ: .xlsx و .csv', limits: 'الحد الأقصى 5 م.ب · 10,000 صف · 32 عموداً', legacyXls: 'ملفات .xls القديمة غير مدعومة. حوّلها إلى .xlsx.',
    selectedFile: 'الملف المحدد', sheets: 'الأوراق المكتشفة', selectSheet: 'الورقة المراد استيرادها', entityType: 'نوع البيانات', detectedColumns: 'الأعمدة المكتشفة',
    mappingTitle: '2. مطابقة الحقول', mappingText: 'يساعد الكشف التلقائي كبداية. تحقق من كل حقل عام من نوع «Field N» قبل التحقق.',
    fieldLabels: {
      name: 'الاسم كما هو', name_fr: 'الاسم بالفرنسية', name_ar: 'الاسم بالعربية', name_en: 'الاسم بالإنجليزية',
      category: 'الفئة', address: 'العنوان', wilaya: 'الولاية', phone: 'الهاتف', opening_status: 'الحالة / أوقات العمل',
      amenities: 'التجهيزات', source_url: 'رابط المصدر', latitude: 'خط العرض', longitude: 'خط الطول',
    },
    entityLabels: { establishment: 'مؤسسة / مكان', wilaya: 'ولاية', moughataa: 'مقاطعة', commune: 'بلدية', locality: 'محلية' },
    ignoreColumn: 'عدم الاستيراد', required: 'إلزامي', optional: 'اختياري',
    previewTitle: '3. المعاينة', previewText: 'تُعرض الصفوف الخمسة الأولى كنص عادي.', emptyPreview: 'لا توجد صفوف قابلة للاستخدام في هذه الورقة.', sourceRow: 'صف المصدر',
    dryRun: 'تحقق تجريبي', validating: 'جارٍ التحقق…', apply: 'تنفيذ الاستيراد', applying: 'جارٍ الاستيراد…',
    confirmTitle: 'تأكيد الاستيراد', confirmWarning: 'سيؤدي هذا الإجراء إلى إضافة أو تحديث بيانات المواقع. تحقق من الأخطاء قبل المتابعة.',
    cancel: 'إلغاء', close: 'إغلاق',
    summaryTitle: 'ملخص التحقق', totalRows: 'الصفوف المكتشفة', validRows: 'الصفوف الصالحة', invalidRows: 'الصفوف غير الصالحة', duplicateRows: 'صفوف مكررة / مطابقة', appliedRows: 'الصفوف المطبقة', insertedRows: 'الصفوف المضافة', updatedRows: 'الصفوف المستكملة', skippedRows: 'صفوف بلا تغيير',
    errorRowsTitle: 'أخطاء الصفوف', noRowErrors: 'لا توجد أخطاء في الصفوف.', row: 'الصف', error: 'الخطأ',
    historyTitle: 'سجل الاستيراد', historyText: 'آخر الدفعات التي عالجها المدراء الأعلى.', emptyHistory: 'لا توجد عمليات استيراد مسجلة.',
    file: 'الملف', sheet: 'الورقة', status: 'الحالة', createdAt: 'تاريخ الإنشاء', completedAt: 'تاريخ الاكتمال',
    loading: 'جارٍ التحميل…', refresh: 'تحديث', retry: 'إعادة المحاولة', parseFailed: 'تعذر قراءة هذا الملف.', importFailed: 'فشلت عملية الاستيراد.', importSucceeded: 'تم استيراد بيانات المواقع بنجاح.', unavailable: 'الخدمة غير متاحة مؤقتاً.', notConnected: 'ترحيل الاستيراد غير متصل بعد.', accessDenied: 'صلاحية المدير الأعلى مطلوبة.', mappingMissing: 'يجب ربط حقل «الاسم كما هو» بأحد الأعمدة.',
    formulaWarning: 'يحتوي هذا الملف على صيغ.', formulasIgnored: 'تم تجاهل الصيغ التي لا تحتوي على نتيجة عددية أو نصية محفوظة.', noFile: 'اختر ملفاً قبل المتابعة.',
    statuses: { created: 'تم الإنشاء', staging: 'قيد التجهيز', draft: 'مسودة', staged: 'مجهز', validating: 'قيد التحقق', validated: 'تم التحقق', invalid: 'غير صالح', applying: 'قيد التطبيق', applied: 'تم الاستيراد', expired: 'منتهي الصلاحية', failed: 'فشل' },
  },
  en: {
    title: 'Localization import',
    intro: 'Inspect, map, and validate Excel data before any final database write.',
    securityNote: 'The file stays in this browser. Only mapped rows are sent through secured Super Admin RPCs.',
    uploadTitle: '1. Source file', uploadText: 'Choose an XLSX workbook or CSV file. Formulas are never executed.',
    chooseFile: 'Choose file', replaceFile: 'Replace file', supportedFiles: 'Formats: .xlsx and .csv', limits: '5 MB maximum · 10,000 rows · 32 columns', legacyXls: 'Legacy .xls files are unsupported. Convert them to .xlsx first.',
    selectedFile: 'Selected file', sheets: 'Detected sheets', selectSheet: 'Sheet to import', entityType: 'Data type', detectedColumns: 'Detected columns',
    mappingTitle: '2. Field mapping', mappingText: 'Automatic detection is a starting point. Review every generic “Field N” column before validation.',
    fieldLabels: {
      name: 'Exact name', name_fr: 'French name', name_ar: 'Arabic name', name_en: 'English name',
      category: 'Category', address: 'Address', wilaya: 'Wilaya', phone: 'Phone', opening_status: 'Status / opening hours',
      amenities: 'Amenities', source_url: 'Source URL', latitude: 'Latitude', longitude: 'Longitude',
    },
    entityLabels: { establishment: 'Establishment / place', wilaya: 'Wilaya', moughataa: 'Moughataa', commune: 'Commune', locality: 'Locality' },
    ignoreColumn: 'Do not import', required: 'required', optional: 'optional',
    previewTitle: '3. Preview', previewText: 'The first five rows are displayed as plain text.', emptyPreview: 'No usable rows were found in this sheet.', sourceRow: 'Source row',
    dryRun: 'Run dry validation', validating: 'Validating…', apply: 'Apply import', applying: 'Importing…',
    confirmTitle: 'Confirm import', confirmWarning: 'This action will add or update localization data. Review errors before continuing.',
    cancel: 'Cancel', close: 'Close',
    summaryTitle: 'Validation summary', totalRows: 'Detected rows', validRows: 'Valid rows', invalidRows: 'Invalid rows', duplicateRows: 'Duplicate / matched rows', appliedRows: 'Applied rows', insertedRows: 'Inserted rows', updatedRows: 'Completed rows', skippedRows: 'Unchanged rows',
    errorRowsTitle: 'Row-level errors', noRowErrors: 'No row-level errors.', row: 'Row', error: 'Error',
    historyTitle: 'Import history', historyText: 'Recent batches processed by Super Admins.', emptyHistory: 'No imports have been recorded.',
    file: 'File', sheet: 'Sheet', status: 'Status', createdAt: 'Created', completedAt: 'Completed',
    loading: 'Loading…', refresh: 'Refresh', retry: 'Retry', parseFailed: 'This file could not be read.', importFailed: 'The import operation failed.', importSucceeded: 'The localization data was imported successfully.', unavailable: 'The service is temporarily unavailable.', notConnected: 'The import migration is not connected yet.', accessDenied: 'Super Admin access is required.', mappingMissing: 'The “Exact name” field must be mapped to a column.',
    formulaWarning: 'This file contains formulas.', formulasIgnored: 'Formulas without a stored scalar result were ignored.', noFile: 'Choose a file before continuing.',
    statuses: { created: 'Created', staging: 'Staging', draft: 'Draft', staged: 'Staged', validating: 'Validating', validated: 'Validated', invalid: 'Invalid', applying: 'Applying', applied: 'Imported', expired: 'Expired', failed: 'Failed' },
  },
}
