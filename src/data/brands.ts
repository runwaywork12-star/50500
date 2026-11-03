export type SeedBrand = {
 slug: string;
 name: string;
 nameEn: string;
 tier: 1 | 2 | 3;
 prefix: boolean;
 models: [string, string, number][];
};

export const SEED_BRANDS: SeedBrand[] = [
 // داخلی
 { slug: "iran-khodro", name: "ایران خودرو", nameEn: "IKCO", tier: 1, prefix: false, models: [["dena-plus", "دنا پلاس", 10], ["tara", "تارا", 10], ["soren-plus", "سورن پلاس", 8], ["samand", "سمند", 6], ["runna-plus", "رانا پلاس", 7], ["reera", "ری را", 6]] },
 { slug: "peugeot", name: "پژو", nameEn: "PEUGEOT", tier: 1, prefix: true, models: [["206", "۲۰۶", 10], ["207", "۲۰۷", 9], ["pars", "پارس", 9], ["405", "۴۰۵", 6], ["2008", "۲۰۰۸", 5], ["301", "۳۰۱", 4]] },
 { slug: "saipa", name: "سایپا", nameEn: "SAIPA", tier: 1, prefix: false, models: [["shahin", "شاهین", 9], ["quick", "کوییک", 8], ["saina", "ساینا", 7], ["atlas", "اطلس", 6], ["tiba", "تیبا", 6]] },
 { slug: "renault", name: "رنو", nameEn: "RENAULT", tier: 1, prefix: true, models: [["l90", "ال ۹۰", 6], ["sandero", "ساندرو", 6], ["captur", "کپچر", 4], ["duster", "داستر", 5]] },
 { slug: "rega-copa", name: "ریگان کوپا", nameEn: "COPA", tier: 1, prefix: false, models: [["t5", "کوپا T5", 4], ["t7", "کوپا T7", 5], ["t10", "کوپا T10", 4]] },
 // چینی
 { slug: "kmc", name: "کی ام سی", nameEn: "KMC", tier: 1, prefix: true, models: [["j7", "J7", 8], ["t8", "T8", 5], ["k7", "K7", 6]] },
 { slug: "mvm", name: "ام وی ام", nameEn: "MVM", tier: 1, prefix: true, models: [["x22", "X22", 6], ["x33", "X33 کراس", 7], ["x55", "X55 پرو", 6], ["arrizo5", "آریزو ۵", 5]] },
 { slug: "chery", name: "چری", nameEn: "CHERY", tier: 1, prefix: true, models: [["tiggo7", "تیگو ۷ پرو", 8], ["tiggo8", "تیگو ۸ پرو", 9], ["arrizo6", "آریزو ۶", 6]] },
 { slug: "jac", name: "جک", nameEn: "JAC", tier: 1, prefix: true, models: [["s3", "S3", 6], ["s5", "S5", 5], ["j4", "J4", 5]] },
 { slug: "mg", name: "ام جی", nameEn: "MG", tier: 1, prefix: true, models: [["mg6", "۶", 5], ["gs", "GS", 5], ["zs", "ZS", 4]] },
 { slug: "geely", name: "جیلی", nameEn: "GEELY", tier: 1, prefix: true, models: [["emgrand7", "امگرند ۷", 5], ["gc6", "GC6", 5], ["azkarra", "آزکارا", 4]] },
 { slug: "haima", name: "هایما", nameEn: "HAIMA", tier: 1, prefix: true, models: [["s7", "S7", 6], ["s5", "S5", 5], ["8s", "8S", 5]] },
 { slug: "brilliance", name: "برلیانس", nameEn: "BRILLIANCE", tier: 1, prefix: true, models: [["h320", "H320", 6], ["h330", "H330", 6], ["v5", "V5", 4]] },
 { slug: "lifan", name: "لیفان", nameEn: "LIFAN", tier: 1, prefix: true, models: [["x50", "X50", 6], ["x60", "X60", 7], ["x80", "X80", 5]] },
 { slug: "greatwall", name: "گریت وال", nameEn: "GREAT WALL", tier: 1, prefix: true, models: [["h6", "H6", 7], ["c30", "C30", 5], ["wingle", "ونگل", 4]] },
 { slug: "changan", name: "چانگان", nameEn: "CHANGAN", tier: 1, prefix: true, models: [["cs35", "CS35", 7], ["cs75", "CS75", 7], ["eado", "ادو", 5]] },
 { slug: "dongfeng", name: "دانگ فانگ", nameEn: "DONGFENG", tier: 1, prefix: true, models: [["h30-cross", "H30 کراس", 6], ["s30", "S30", 5], ["ax7", "AX7", 5]] },
 { slug: "faw", name: "فاو", nameEn: "FAW", tier: 1, prefix: true, models: [["b50", "B50", 6], ["x40", "X40", 5]] },
 { slug: "capra", name: "کاپرا", nameEn: "CAPRA", tier: 1, prefix: true, models: [["2", "۲", 5], ["3", "۳", 5], ["7", "۷", 4]] },
 { slug: "byd", name: "بایدی", nameEn: "BYD", tier: 1, prefix: true, models: [["f3", "F3", 5], ["s6", "S6", 4]] },
 { slug: "swm", name: "SWM", nameEn: "SWM", tier: 1, prefix: false, models: [["g01", "G01", 5], ["x3", "X3", 4]] },
 { slug: "baic", name: "بایک", nameEn: "BAIC", tier: 1, prefix: true, models: [["x35", "X35", 5], ["bj40", "BJ40", 4]] },
 { slug: "bisu", name: "بیسو", nameEn: "BISU", tier: 1, prefix: true, models: [["t60", "T60", 5], ["x35", "X35", 4]] },
 // کره‌ای و ژاپنی
 { slug: "toyota", name: "تویوتا", nameEn: "TOYOTA", tier: 2, prefix: true, models: [["camry", "کمری", 7], ["corolla", "کرولا", 7], ["rav4", "راو ۴", 6], ["land-cruiser", "لندکروزر", 5], ["chr", "C-HR", 5]] },
 { slug: "hyundai", name: "هیوندای", nameEn: "HYUNDAI", tier: 2, prefix: true, models: [["tucson", "توسان", 8], ["santafe", "سانتافه", 7], ["sonata", "سوناتا", 6], ["elantra", "النترا", 6], ["azera", "آزرا", 5]] },
 { slug: "kia", name: "کیا", nameEn: "KIA", tier: 2, prefix: true, models: [["sportage", "اسپورتیج", 8], ["cerato", "سراتو", 7], ["optima", "اپتیما", 5], ["sorento", "سورنتو", 6]] },
 { slug: "mazda", name: "مزدا", nameEn: "MAZDA", tier: 2, prefix: true, models: [["mazda3", "۳ نیو", 7], ["cx5", "CX-5", 6], ["mazda6", "۶", 4]] },
 { slug: "nissan", name: "نیسان", nameEn: "NISSAN", tier: 2, prefix: true, models: [["qashqai", "قشقایی", 6], ["xtrail", "ایکس تریل", 6], ["maxima", "ماکسیما", 5], ["juke", "جوک", 4]] },
 { slug: "suzuki", name: "سوزوکی", nameEn: "SUZUKI", tier: 2, prefix: true, models: [["alto", "التو", 6], ["swift", "سوئیفت", 6], ["vitara", "ویتارا", 5], ["grand-vitara", "گرند ویتارا", 5]] },
 { slug: "ssangyong", name: "سانگ یانگ", nameEn: "SSANGYONG", tier: 2, prefix: true, models: [["tivoli", "تیوولی", 6], ["korando", "کوراندو", 5], ["rexton", "رکستون", 4], ["actyon", "اکتیون", 4]] },
 { slug: "lexus", name: "لکسوس", nameEn: "LEXUS", tier: 2, prefix: true, models: [["nx", "NX", 5], ["rx", "RX", 5], ["es", "ES", 4]] },
 { slug: "honda", name: "هوندا", nameEn: "HONDA", tier: 2, prefix: true, models: [["accord", "آکورد", 6], ["civic", "سیویک", 6], ["cr-v", "CR-V", 5]] },
 { slug: "daewoo", name: "دوو", nameEn: "DAEWOO", tier: 2, prefix: true, models: [["cielo", "سیلو", 6], ["matiz", "ماتیز", 6], ["magnus", "ماگنوس", 5]] },
 { slug: "infiniti", name: "اینفینیتی", nameEn: "INFINITI", tier: 2, prefix: true, models: [["ex35", "EX35", 5], ["qx50", "QX50", 5], ["qx60", "QX60", 4]] },
 { slug: "subaru", name: "سوبارو", nameEn: "SUBARU", tier: 2, prefix: true, models: [["legacy", "لگاسی", 5], ["forester", "فورستر", 5], ["outback", "اوتبک", 4]] },
 { slug: "mitsubishi", name: "میتسوبیشی", nameEn: "MITSUBISHI", tier: 2, prefix: true, models: [["l200", "L200", 6], ["asx", "ASX", 5], ["outlander", "اوتلندر", 5], ["pajero", "پاجرو", 5], ["lancer", "لنسر", 4]] },
 { slug: "landmark", name: "لندمارک", nameEn: "LANDMARK", tier: 2, prefix: false, models: [["lx570", "LX570", 4], ["range-rover", "رنجرور", 4]] },
 // اروپایی و آمریکایی
 { slug: "benz", name: "بنز", nameEn: "MERCEDES", tier: 3, prefix: true, models: [["c200", "C200", 7], ["e250", "E250", 6], ["glc", "GLC", 5], ["s500", "S500", 4]] },
 { slug: "volkswagen", name: "فولکس واگن", nameEn: "VOLKSWAGEN", tier: 3, prefix: true, models: [["tiguan", "تیگوان", 5], ["passat", "پاسات", 4], ["golf", "گلف", 4]] },
 { slug: "bmw", name: "بی ام و", nameEn: "BMW", tier: 3, prefix: true, models: [["x3", "X3", 7], ["x5", "X5", 6], ["series3", "سری ۳", 5], ["series5", "سری ۵", 5]] },
 { slug: "citroen", name: "سیتروئن", nameEn: "CITROEN", tier: 2, prefix: true, models: [["xantia", "زانتیا", 6], ["c3", "C3", 4], ["c4", "C4", 4], ["elysee", "الیزه", 4]] },
 { slug: "porsche", name: "پورش", nameEn: "PORSCHE", tier: 3, prefix: true, models: [["cayenne", "کاین", 5], ["macan", "ماکان", 5], ["911", "۹۱۱", 4], ["panamera", "پانامرا", 4]] },
 { slug: "audi", name: "آئودی", nameEn: "AUDI", tier: 3, prefix: true, models: [["a4", "A4", 5], ["a6", "A6", 5], ["q5", "Q5", 5], ["q7", "Q7", 4]] },
 { slug: "volvo", name: "ولوو", nameEn: "VOLVO", tier: 3, prefix: true, models: [["xc60", "XC60", 5], ["xc90", "XC90", 4], ["s60", "S60", 4]] },
 { slug: "maserati", name: "مازراتی", nameEn: "MASERATI", tier: 3, prefix: true, models: [["ghibli", "گیبلی", 4], ["levante", "لوبانه", 4], ["quattroporte", "کواتروپورته", 3]] },
 { slug: "dodge", name: "دوج", nameEn: "DODGE", tier: 3, prefix: true, models: [["challenger", "چلنجر", 4], ["journey", "جورنی", 4]] },
];
