// Search intents, not translated product names. Original names stay searchable.
const groups={
 ai:['inteligencia artificial','herramientas ia','inteligência artificial','ferramentas ia','एआई','आर्टिफिशियल इंटेलिजेंस','kecerdasan buatan','intelligence artificielle','outils ia','künstliche intelligenz','ki tools','الذكاء الاصطناعي','人工知能','aiツール','trí tuệ nhân tạo','công cụ ai','कृत्रिम बुद्धिमत्ता'],
 seo:['posicionamiento web','optimización de buscadores','otimização de buscas','एसईओ','optimasi mesin pencari','référencement','optimisation moteurs de recherche','suchmaschinenoptimierung','تحسين محركات البحث','検索エンジン最適化','tối ưu công cụ tìm kiếm'],
 'video editing':['edición de vídeo','edición de video','editar videos','edição de vídeo','वीडियो एडिटिंग','वीडियो संपादन','edit video','penyuntingan video','montage vidéo','videobearbeitung','تحرير الفيديو','動画編集','chỉnh sửa video','भिडियो सम्पादन'],
 reels:['vídeos cortos','vídeos curtos','रील्स','video pendek','vidéos courtes','kurzvideos','مقاطع قصيرة','ショート動画','video ngắn','रिल्स'],
 automation:['automatización','automação','ऑटोमेशन','स्वचालन','otomatisasi','automatisation','automatisierung','الأتمتة','自動化','tự động hóa'],
 finance:['finanzas','finanças','वित्त','keuangan','finances','finanzen','التمويل','金融','tài chính'],
 fitness:['ejercicio','entrenamiento','exercícios','फिटनेस','व्यायाम','kebugaran','remise en forme','entraînement','training','اللياقة البدنية','フィットネス','thể dục'],
 'earn money':['ganar dinero','ganhar dinheiro','पैसे कमाना','menghasilkan uang','gagner de l’argent','gagner de l argent','geld verdienen','كسب المال','お金を稼ぐ','kiếm tiền','पैसा कमाउने'],
 design:['diseño','डिज़ाइन','desain','conception','gestaltung','التصميم','デザイン','thiết kế','डिजाइन'],
 python:['पायथन','بايثون','パイソン'],
 business:['negocios','negócios','व्यापार','bisnis','entreprise','geschäft','الأعمال','ビジネス','kinh doanh','व्यवसाय']
};
export function localizedIntent(query,normalize){const q=normalize(query);for(const [intent,aliases]of Object.entries(groups))if(aliases.some(value=>normalize(value)===q))return intent;return query;}
