import type { ProductSpec } from "./schema";
import { MAT_URLS } from "../lib/mat-photos";
import { ACCESSORY_CATEGORY_PHOTO, ACCESSORY_PHOTOS } from "../lib/accessory-photos";

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

/** Supplemental Iranian-market make/model directory shown in the supplied vehicle menu.
 * These are fitment choices only. They deliberately do not create products or stock.
 */
export type VehicleDirectoryExtension = {
  slug: string;
  name: string;
  nameEn: string;
  models: [string, string][];
};

export const VEHICLE_DIRECTORY_EXTENSIONS: VehicleDirectoryExtension[] = [
  // Additional makes visible in the supplied reference menu
  { slug: "bac", name: "بی ای سی (BAC)", nameEn: "BAC", models: [["x3", "X3"]] },
  { slug: "avatar", name: "آواتار", nameEn: "AVATR", models: [["0707", "۰۷۰۷"], ["1111", "۱۱۱۱"], ["1212", "۱۲۱۲"]] },
  { slug: "max-motor", name: "مکث موتور", nameEn: "MAX MOTOR", models: [["l5", "L5"], ["l7", "L7"], ["l8", "L8"], ["tiara", "تیارا"], ["tiara-prime", "تیارا پرایم"], ["kalut", "کلوت"]] },
  { slug: "bentley", name: "بنتلی", nameEn: "BENTLEY", models: [["bentayga", "بنتایگا"], ["continental-gt", "کانتیننتال GT"], ["flying-spur", "فلایینگ اسپر"]] },
  { slug: "venucia", name: "ونوسیا", nameEn: "VENUCIA", models: [["star", "استار"], ["v-online", "V-Online"], ["d60-plus", "D60 پلاس"]] },
  { slug: "dayun", name: "دایون", nameEn: "DAYUN", models: [["y5", "Y5"], ["y7", "Y7"], ["v5", "V5"]] },
  { slug: "amico", name: "آمیکو", nameEn: "AMICO", models: [["asena", "آسنا"], ["artiston", "آرتیستون"]] },
  { slug: "skoda", name: "اشکودا", nameEn: "SKODA", models: [["scala", "اسکالا"], ["octavia", "اکتاویا"], ["superb", "سوپرب"], ["fabia", "فابیا"], ["karoq", "کاروک"], ["kamiq", "کامیک"], ["kushak", "کوشاک"]] },
  { slug: "damai", name: "دامای", nameEn: "DOMY", models: [["x5", "X5"], ["x7", "X7"], ["x3", "X3"]] },
  { slug: "uaz", name: "یواز", nameEn: "UAZ", models: [["patriot", "پاتریوت"], ["hunter", "هانتر"], ["pickup", "پیکاپ"]] },
  { slug: "proton", name: "پروتون", nameEn: "PROTON", models: [["gen2", "جن ۲"], ["impian", "ایمپین"], ["wira", "ویرا"]] },
  { slug: "zamyad", name: "زامیاد", nameEn: "ZAMYAD", models: [["padra", "پادرا"], ["padra-plus", "پادرا پلاس"], ["z24", "Z24"], ["shooka", "شوکا"]] },
  { slug: "alfa-romeo", name: "آلفارومئو", nameEn: "ALFA ROMEO", models: [["4c", "4C"], ["giulietta", "جولیتا"], ["mito", "میتو"]] },
  { slug: "fiat", name: "فیات", nameEn: "FIAT", models: [["500", "500"], ["500x", "500X"], ["tipo", "تیپو"], ["doblo", "دووبلو"]] },
  { slug: "foton", name: "فوتون", nameEn: "FOTON", models: [["tunland-g7", "تونلند G7"], ["tunland-v7", "تونلند V7"], ["sauvana", "ساوانا"], ["view", "ویو"]] },
  { slug: "farda", name: "فردا", nameEn: "FARDA", models: [["sx5", "SX5"], ["t5", "T5"], ["511", "۵۱۱"], ["520", "۵۲۰"]] },
  { slug: "gac-trumpchi", name: "ترامپچی", nameEn: "GAC TRUMPCHI", models: [["gs3", "GS3"], ["gs4", "GS4"], ["gs5", "GS5"], ["gs8", "GS8"], ["empow", "امپو"]] },
  { slug: "tigard", name: "تیگارد", nameEn: "TIGARD", models: [["l7", "L7"], ["tissan", "تیسان"], ["tigard", "تیگارد"]] },
  { slug: "eres", name: "ایرس", nameEn: "ERES", models: [["hm5", "HM5"], ["m6", "M6"]] },
  { slug: "ds", name: "دی اس", nameEn: "DS AUTOMOBILES", models: [["ds3", "DS3"], ["ds4", "DS4"], ["ds5", "DS5"], ["ds7", "DS7"]] },
  { slug: "respect", name: "ریسپکت", nameEn: "RESPECT", models: [["respect-1", "ریسپکت ۱"], ["respect-2", "ریسپکت ۲"]] },
  { slug: "borgward", name: "بورگوارد", nameEn: "BORGWARD", models: [["bx5", "BX5"], ["bx7", "BX7"]] },
  { slug: "cadillac", name: "کادیلاک", nameEn: "CADILLAC", models: [["ats", "ATS"], ["cts", "CTS"], ["xt5", "XT5"], ["escalade", "اسکالید"]] },
  { slug: "hanteng", name: "هن تنگ", nameEn: "HANTENG", models: [["x5", "X5"], ["x7", "X7"]] },
  { slug: "lamari", name: "لاماری", nameEn: "LAMARI", models: [["ima", "ایما"], ["ima-hev", "ایما هیبرید"], ["neo", "نئو"]] },
  { slug: "ford", name: "فورد", nameEn: "FORD", models: [["mustang", "موستانگ"], ["edge", "اِج"], ["explorer", "اکسپلورر"], ["escape", "اسکیپ"], ["ranger", "رَنجر"], ["f150", "F-150"]] },
  { slug: "chevrolet", name: "شورولت", nameEn: "CHEVROLET", models: [["camaro", "کامارو"], ["cruze", "کروز"], ["captiva", "کپتیوا"], ["tahoe", "تاهو"], ["malibu", "مالیبو"], ["equinox", "اکوئناکس"]] },

  // Fill gaps in makes already present in the original catalogue.
  { slug: "iran-khodro", name: "ایران خودرو", nameEn: "IKCO", models: [["arisan-2", "آریسان ۲"], ["dena", "دنا"], ["soren", "سورن"], ["rana", "رانا"], ["samand-lx", "سمند LX"], ["bardo", "وانت باردو"]] },
  { slug: "peugeot", name: "پژو", nameEn: "PEUGEOT", models: [["206-sd", "۲۰۶ صندوقدار"], ["207-sedan", "۲۰۷ صندوقدار"], ["407", "۴۰۷"], ["508", "۵۰۸"], ["partner", "پارتنر"]] },
  { slug: "saipa", name: "سایپا", nameEn: "SAIPA", models: [["pride", "پراید"], ["151", "۱۵۱"], ["aria", "آریا"]] },
  { slug: "jac", name: "جک", nameEn: "JAC", models: [["j3", "J3 توجوی"], ["j5", "J5"], ["sr3", "SR3"], ["sr6", "SR6"], ["t9", "T9"], ["x5", "X5"]] },
  { slug: "kmc", name: "کی ام سی", nameEn: "KMC", models: [["sr3", "SR3"], ["sr5", "SR5"], ["x5", "X5"], ["t9", "T9"]] },
  { slug: "mvm", name: "ام وی ام", nameEn: "MVM", models: [["110", "۱۱۰"], ["110s", "۱۱۰ S"], ["315", "۳۱۵"], ["530", "۵۳۰"], ["550", "۵۵۰"], ["x33", "X33"], ["x5", "X5"], ["x77", "X77"], ["arrizo6-gt", "آریزو ۶ GT"], ["arrizo8", "آریزو ۸"]] },
  { slug: "chery", name: "چری", nameEn: "CHERY", models: [["tiggo5", "تیگو ۵"], ["tiggo7", "تیگو ۷"], ["tiggo8", "تیگو ۸"], ["arrizo5", "آریزو ۵"], ["arrizo8", "آریزو ۸"]] },
  { slug: "geely", name: "جیلی", nameEn: "GEELY", models: [["emgrand-x7", "امگرند X7"], ["coolray", "کول‌ری"]] },
  { slug: "haima", name: "هایما", nameEn: "HAIMA", models: [["s8", "S8"], ["7x", "7X"]] },
  { slug: "brilliance", name: "برلیانس", nameEn: "BRILLIANCE", models: [["h220", "H220"], ["h230", "H230"], ["c3-cross", "کراس C3"]] },
  { slug: "greatwall", name: "گریت وال", nameEn: "GREAT WALL", models: [["voleex-c30", "ولیکس C30"], ["wingle-3", "وینگل ۳"], ["wingle-5", "وینگل ۵"]] },
  { slug: "changan", name: "چانگان", nameEn: "CHANGAN", models: [["cs35-plus", "CS35 پلاس"], ["cs55", "CS55"], ["uni-t", "UNI-T"]] },
  { slug: "dongfeng", name: "دانگ فنگ", nameEn: "DONGFENG", models: [["shine", "شاین"], ["fengon-5", "فنگون ۵"]] },
  { slug: "faw", name: "فاو", nameEn: "FAW", models: [["b30", "B30"], ["bestune-t77", "بستیون T77"], ["b70", "B70"]] },
  { slug: "byd", name: "BYD", nameEn: "BYD", models: [["s7", "S7"], ["song-plus", "سانگ پلاس"], ["qin-plus", "چین پلاس"]] },
  { slug: "swm", name: "SWM", nameEn: "SWM", models: [["g01f", "G01F"], ["g01-pro", "G01 Pro"]] },
  { slug: "baic", name: "بایک", nameEn: "BAIC", models: [["bj30", "BJ30"], ["u5-plus", "U5 پلاس"], ["x55", "X55"]] },
  { slug: "bisu", name: "بیسو", nameEn: "BISU", models: [["t3", "T3"], ["t5", "T5"]] },
  { slug: "toyota", name: "تویوتا", nameEn: "TOYOTA", models: [["prado", "پرادو"], ["yaris", "یاریس"], ["hilux", "هایلوکس"], ["highlander", "هایلندر"], ["corolla-cross", "کرولا کراس"], ["venza", "ونزا"]] },
  { slug: "hyundai", name: "هیوندای", nameEn: "HYUNDAI", models: [["accent", "اکسنت"], ["i20", "i20"], ["i30", "i30"], ["ioniq", "آیونیک"], ["palisade", "پالیسید"]] },
  { slug: "kia", name: "کیا", nameEn: "KIA", models: [["rio", "ریو"], ["picanto", "پیکانتو"], ["soul", "سول"], ["stinger", "استینگر"], ["k5", "K5"]] },
  { slug: "mazda", name: "مزدا", nameEn: "MAZDA", models: [["mazda2", "۲"], ["mazda323", "۳۲۳"], ["cx3", "CX-3"], ["cx9", "CX-9"]] },
  { slug: "nissan", name: "نیسان", nameEn: "NISSAN", models: [["patrol", "پاترول"], ["murano", "مورانو"], ["teana", "تیانا"], ["pickup", "پیکاپ"]] },
  { slug: "suzuki", name: "سوزوکی", nameEn: "SUZUKI", models: [["jimny", "جیمنی"], ["s-cross", "S-Cross"]] },
  { slug: "ssangyong", name: "سانگ یانگ", nameEn: "SSANGYONG", models: [["musso", "موسو"], ["kyron", "کایرون"]] },
  { slug: "lexus", name: "لکسوس", nameEn: "LEXUS", models: [["is", "IS"], ["gs", "GS"], ["lx", "LX"], ["ux", "UX"]] },
  { slug: "daewoo", name: "دوو", nameEn: "DAEWOO", models: [["lanos", "لانوس"], ["espero", "اسپرو"], ["leganza", "لگانزا"]] },
  { slug: "subaru", name: "سوبارو", nameEn: "SUBARU", models: [["xv", "XV"], ["impreza", "ایمپرزا"]] },
  { slug: "mitsubishi", name: "میتسوبیشی", nameEn: "MITSUBISHI", models: [["galant", "گالانت"], ["eclipse-cross", "اکلیپس کراس"]] },
  { slug: "landmark", name: "لندمارک", nameEn: "LANDMARK", models: [["v7", "V7"]] },
  { slug: "benz", name: "بنز", nameEn: "MERCEDES-BENZ", models: [["a-class", "کلاس A"], ["cla", "CLA"], ["gle", "GLE"], ["gls", "GLS"], ["c-class", "کلاس C"], ["e-class", "کلاس E"], ["s-class", "کلاس S"], ["g-class", "کلاس G"]] },
  { slug: "volkswagen", name: "فولکس واگن", nameEn: "VOLKSWAGEN", models: [["id4", "ID.4"], ["jetta", "جتا"], ["arteon", "آرتئون"]] },
  { slug: "bmw", name: "بی ام و", nameEn: "BMW", models: [["x1", "X1"], ["x2", "X2"], ["x4", "X4"], ["x6", "X6"], ["z4", "Z4"], ["i8", "i8"]] },
  { slug: "citroen", name: "سیتروئن", nameEn: "CITROEN", models: [["c5", "C5"], ["c5-aircross", "C5 Aircross"]] },
  { slug: "porsche", name: "پورشه", nameEn: "PORSCHE", models: [["boxster", "باکستر"], ["cayman", "کیمن"]] },
  { slug: "audi", name: "آئودی", nameEn: "AUDI", models: [["q4-etron", "Q4 e-tron"], ["q5-etron", "Q5 e-tron"], ["tt", "TT"], ["a3", "A3"]] },
  { slug: "volvo", name: "ولوو", nameEn: "VOLVO", models: [["s90", "S90"], ["v40", "V40"]] },
  { slug: "maserati", name: "مازراتی", nameEn: "MASERATI", models: [["ghibli", "گیبلی"], ["levante", "لوانته"]] },
  { slug: "dodge", name: "دوج", nameEn: "DODGE", models: [["charger", "چارجر"], ["durango", "دورانگو"], ["ram", "رم"]] },
];

export type CategoryDef = {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  image: string;
  optionsType: "leather" | "none";
  perModel: boolean;
  slugPrefix: string;
  prices: [number, number, number];
  images: string[];
  delivery: string;
  specs: ProductSpec[];
  title: (car: string) => string;
  body: (car: string) => string;
};

export const LEATHER_CATEGORY = "embroidered-leather";

export const CATEGORY_DEFS: CategoryDef[] = [
  {
    slug: LEATHER_CATEGORY,
    name: "کفپوش چرمی گلدوزی",
    shortName: "کفپوش چرمی گلدوزی",
    description: "رویه چرمی با دوخت ریزبافت، فوم ۹ میلی‌متری و پارچه جودون؛ در مدل‌ها و رنگ‌های قابل انتخاب.",
    image: MAT_URLS[0],
    optionsType: "leather",
    perModel: true,
    slugPrefix: "5d-leather",
    prices: [7500000, 8400000, 9800000],
    images: MAT_URLS,
    delivery: "۴ تا ۷ روز کاری",
    specs: [
      { label: "جنس رویه", value: "رویه چرمی" },
      { label: "دوخت", value: "دوخت ریزبافت" },
      { label: "جزئیات ساخت", value: "پرداخت ظریف و دوخت ریزبافت" },
      { label: "ساختار", value: "۴ لایه: رویه چرمی، فوم ۹ میلی‌متری، پارچه جودون و لایه زیرین" },
      { label: "ارتفاع لبه", value: "۱۲ سانتی‌متر" },
      { label: "تعداد تکه", value: "۳ تکه (راننده، شاگرد، عقب یکپارچه)" },
      { label: "گلدوزی لوگو", value: "لوگوی خودرو روی کفپوش راننده (رایگان)" },
      { label: "ضد آب و ضد لغزش", value: "بله" },
            { label: "گارانتی", value: "۱۲ ماه ضمانت کیفیت" },
    ],
    title: (car) => `کفپوش چرمی گلدوزی پنج بعدی ${car}`,
    body: (car) =>
      `کفپوش چرمی گلدوزی ${car} با اسکن سه‌بعدی دقیق از کف خودرو طراحی و به‌صورت کاملاً سفارشی در کارگاه ۵۰۵۰۰ دوخته و گلدوزی می‌شود. لبه‌های بلند این کفپوش تمام سطح کف و دیواره‌های کناری را می‌پوشاند و از نفوذ آب، گل و آلودگی به موکت اصلی خودرو جلوگیری می‌کند.\nرنگ چرم و رنگ نخ گلدوزی را مطابق سلیقه خود انتخاب کنید؛ لوگوی خودرو نیز به صورت رایگان روی کفپوش راننده گلدوزی می‌شود.\nبه دلیل تولید سفارشی، این محصول ظرف ۴ تا ۷ روز کاری آماده و ارسال می‌شود.`,
  },
  {
    slug: "accessories",
    name: "همه لوازم جانبی خودرو",
    shortName: "لوازم جانبی",
    description: "نظم‌دهنده صندوق، کاور فرمان، کوسن گردنی، جاکلیدی و دیگر اکسسوری‌های کاربردی و چرمی خودرو با همان کیفیت ۵۰۵۰۰.",
    image: ACCESSORY_CATEGORY_PHOTO,
    optionsType: "none",
    perModel: false,
    slugPrefix: "acc",
    prices: [0, 0, 0],
    images: [ACCESSORY_CATEGORY_PHOTO],
    delivery: "۱ تا ۳ روز کاری",
    specs: [],
    title: (car) => car,
    body: (car) => car,
  },
];

export const ACCESSORIES = [
  {
    slug: "acc-steering-lock",
    title: "قفل فرمان ضدسرقت دوقلاب",
    price: 1450000,
    comparePrice: 1750000,
    stock: 120,
    image: ACCESSORY_PHOTOS["acc-steering-lock"],
    rating: 4.8,
    ratingCount: 212,
    salesCount: 1640,
    featured: true,
    delivery: "۱ تا ۳ روز کاری",
    body: "قفل فرمان فولادی با دو قلاب قابل تنظیم و قفل سیلندری مقاوم؛ روی همه فرمان‌ها بسته می‌شود و یک مانع دیداری جدی برای سارقان است. دارای پوشش لاستیکی برای جلوگیری از خط افتادن فرمان.",
    specs: [
      { label: "جنس", value: "فولاد آلیاژی" },
      { label: "طول قابل تنظیم", value: "۳۶ تا ۸۴ سانتی‌متر" },
      { label: "کلید", value: "۲ عدد" },
      { label: "گارانتی", value: "۱۲ ماه" },
    ],
  },
  {
    slug: "acc-pedal-lock",
    title: "قفل پدال ترمز و کلاچ",
    price: 1250000,
    comparePrice: null,
    stock: 120,
    image: ACCESSORY_PHOTOS["acc-pedal-lock"],
    rating: 4.7,
    ratingCount: 148,
    salesCount: 1180,
    featured: true,
    delivery: "۱ تا ۳ روز کاری",
    body: "قفل پدال U شکل از جنس استیل ضدزنگ که پدال ترمز یا کلاچ را کاملاً بی‌حرکت می‌کند؛ نصب با یک دست و در چند ثانیه، مناسب بیشتر خودروهای سواری و شاسی‌بلند.",
    specs: [
      { label: "جنس", value: "استیل ضدزنگ" },
      { label: "مناسب پدال", value: "۱۰ تا ۱۶ سانتی‌متر" },
      { label: "کلید", value: "۳ عدد" },
      { label: "گارانتی", value: "۱۲ ماه" },
    ],
  },
  {
    slug: "acc-wheel-cover",
    title: "روکش دور فرمان چرمی مشکی",
    price: 890000,
    comparePrice: 1050000,
    stock: 120,
    image: ACCESSORY_PHOTOS["acc-wheel-cover"],
    rating: 4.8,
    ratingCount: 265,
    salesCount: 2100,
    featured: true,
    delivery: "۱ تا ۳ روز کاری",
    body: "روکش دور فرمان از چرم نانو و جیر با لایه سیلیکونی ضدلغزش؛ گرفتن فرمان را نرم‌تر و مطمئن‌تر می‌کند و از فرسودگی فرمان اصلی جلوگیری می‌کند.",
    specs: [
      { label: "جنس", value: "چرم نانو + جیر" },
      { label: "قطر مناسب", value: "۳۷ تا ۳۹ سانتی‌متر" },
      { label: "لایه داخلی", value: "سیلیکون ضدلغزش" },
      { label: "گارانتی", value: "۶ ماه" },
    ],
  },
  {
    slug: "acc-wheel-cover-brown",
    title: "روکش دور فرمان چرم قهوه‌ای",
    price: 950000,
    comparePrice: null,
    stock: 120,
    image: ACCESSORY_PHOTOS["acc-wheel-cover-brown"],
    rating: 4.7,
    ratingCount: 98,
    salesCount: 760,
    featured: false,
    delivery: "۱ تا ۳ روز کاری",
    body: "روکش فرمان چرم میکروفایبر قهوه‌ای با دوخت ظریف؛ هماهنگ با کفپوش‌های قهوه‌ای و کرم ۵۰۵۰۰.",
    specs: [
      { label: "جنس", value: "چرم میکروفایبر" },
      { label: "قطر مناسب", value: "۳۸ سانتی‌متر" },
      { label: "رنگ", value: "قهوه‌ای" },
      { label: "گارانتی", value: "۶ ماه" },
    ],
  },
  {
    slug: "acc-gap-organizer",
    title: "نظم‌دهنده چرمی کنار صندلی",
    price: 980000,
    comparePrice: 1150000,
    stock: 120,
    image: ACCESSORY_PHOTOS["acc-gap-organizer"],
    rating: 4.7,
    ratingCount: 132,
    salesCount: 980,
    featured: false,
    delivery: "۱ تا ۳ روز کاری",
    body: "پرکننده فاصله صندلی و کنسول با روکش چرم و جای لیوان؛ از افتادن موبایل، کلید و کارت جلوگیری می‌کند.",
    specs: [
      { label: "جنس", value: "چرم PU + ABS" },
      { label: "ابعاد", value: "۲۷ × ۱۴ × ۶ سانتی‌متر" },
      { label: "نصب", value: "بدون ابزار" },
      { label: "گارانتی", value: "۶ ماه" },
    ],
  },
  {
    slug: "acc-neck-pillow",
    title: "ست کوسن گردنی و کمری چرمی",
    price: 1450000,
    comparePrice: 1700000,
    stock: 120,
    image: ACCESSORY_PHOTOS["acc-neck-pillow"],
    rating: 4.8,
    ratingCount: 121,
    salesCount: 690,
    featured: false,
    delivery: "۱ تا ۳ روز کاری",
    body: "ست کوسن گردنی و کمری با فوم مموری و روکش چرم؛ خستگی سفرهای طولانی را کم می‌کند.",
    specs: [
      { label: "تعداد", value: "۲ عدد" },
      { label: "داخل", value: "فوم مموری" },
      { label: "روکش", value: "چرم قابل شستشو" },
      { label: "گارانتی", value: "۶ ماه" },
    ],
  },
  {
    slug: "acc-seat-belt",
    title: "روکش چرمی کمربند ایمنی (جفت)",
    price: 390000,
    comparePrice: null,
    stock: 120,
    image: ACCESSORY_PHOTOS["acc-seat-belt"],
    rating: 4.6,
    ratingCount: 87,
    salesCount: 1320,
    featured: false,
    delivery: "۱ تا ۳ روز کاری",
    body: "روکش شانه کمربند ایمنی از چرم نرم با دوخت تزئینی؛ مانع ساییدگی گردن و شانه می‌شود.",
    specs: [
      { label: "تعداد", value: "جفت" },
      { label: "جنس", value: "چرم PU" },
      { label: "بستن", value: "چسب پارچه‌ای" },
      { label: "گارانتی", value: "۳ ماه" },
    ],
  },
  {
    slug: "acc-trunk-organizer",
    title: "نظم‌دهنده تاشو صندوق عقب",
    price: 2600000,
    comparePrice: 2950000,
    stock: 120,
    image: ACCESSORY_PHOTOS["acc-trunk-organizer"],
    rating: 4.8,
    ratingCount: 96,
    salesCount: 640,
    featured: true,
    delivery: "۱ تا ۳ روز کاری",
    body: "نظم‌دهنده تاشو چرمی صندوق عقب با درب مغناطیسی و دسته‌های حمل؛ خرید و وسایل را مرتب نگه می‌دارد.",
    specs: [
      { label: "ظرفیت", value: "۴۰ لیتر" },
      { label: "جنس", value: "چرم اکو + پارچه ضدآب" },
      { label: "درب", value: "مغناطیسی" },
      { label: "گارانتی", value: "۶ ماه" },
    ],
  },
  {
    slug: "acc-trunk-organizer-suede",
    title: "جعبه صندوق عقب جیر لوکس",
    price: 2950000,
    comparePrice: null,
    stock: 120,
    image: ACCESSORY_PHOTOS["acc-trunk-organizer-suede"],
    rating: 4.7,
    ratingCount: 54,
    salesCount: 310,
    featured: false,
    delivery: "۱ تا ۳ روز کاری",
    body: "جعبه صندوق عقب با روکش جیر طوسی و پارتیشن‌های قابل جابجایی؛ ظرفیت بالا و تاشو.",
    specs: [
      { label: "جنس", value: "جیر مصنوعی" },
      { label: "پارتیشن", value: "قابل جداسازی" },
      { label: "تاشو", value: "بله" },
      { label: "گارانتی", value: "۶ ماه" },
    ],
  },
  {
    slug: "acc-seat-back",
    title: "نظم‌دهنده چرمی پشت صندلی",
    price: 1250000,
    comparePrice: 1450000,
    stock: 120,
    image: ACCESSORY_PHOTOS["acc-seat-back"],
    rating: 4.6,
    ratingCount: 77,
    salesCount: 520,
    featured: false,
    delivery: "۱ تا ۳ روز کاری",
    body: "نظم‌دهنده پشت صندلی با جیب‌های متعدد و جای تبلت؛ پشت صندلی را از ضربه پای کودکان حفظ می‌کند.",
    specs: [
      { label: "جنس", value: "چرم PU" },
      { label: "جیب", value: "۶ جیب" },
      { label: "نصب", value: "بند به پشت‌سری" },
      { label: "گارانتی", value: "۶ ماه" },
    ],
  },
  {
    slug: "acc-armrest-organizer",
    title: "کیف چرمی دسته صندلی (آرنج‌گیر)",
    price: 1150000,
    comparePrice: null,
    stock: 120,
    image: ACCESSORY_PHOTOS["acc-armrest-organizer"],
    rating: 4.7,
    ratingCount: 63,
    salesCount: 410,
    featured: false,
    delivery: "۱ تا ۳ روز کاری",
    body: "کیف ۵ کاره روی آرنج‌گیر با جای لیوان و دستمال؛ کنسول وسط را مرتب و شیک می‌کند.",
    specs: [
      { label: "جنس", value: "چرم مصنوعی" },
      { label: "کاربرد", value: "۵ کاره" },
      { label: "رنگ", value: "کرم" },
      { label: "گارانتی", value: "۶ ماه" },
    ],
  },
  {
    slug: "acc-key-case",
    title: "کیف چرمی سوئیچ خودرو",
    price: 390000,
    comparePrice: null,
    stock: 120,
    image: ACCESSORY_PHOTOS["acc-key-case"],
    rating: 4.7,
    ratingCount: 188,
    salesCount: 1900,
    featured: false,
    delivery: "۱ تا ۳ روز کاری",
    body: "کیف سوئیچ از چرم با قفل داخلی؛ از سوئیچ در برابر ضربه و خط محافظت می‌کند.",
    specs: [
      { label: "جنس", value: "چرم PU" },
      { label: "مناسب", value: "بیشتر سوئیچ‌ها" },
      { label: "گارانتی", value: "۳ ماه" },
    ],
  },
];

export const FEATURED = new Set<string>([
  "5d-leather-peugeot-206",
  "5d-leather-iran-khodro-tara",
  "5d-leather-iran-khodro-dena-plus",
  "5d-leather-saipa-shahin",
  "5d-leather-bmw-x3",
  "5d-leather-toyota-camry",
  "5d-leather-hyundai-tucson",
  "5d-leather-chery-tiggo8",
  "5d-leather-kmc-j7",
  "5d-leather-kia-sportage",
  "5d-leather-peugeot-pars",
  "5d-leather-benz-c200",
]);

export const REVIEW_POOL = [
  { name: "سحر جعفری", city: "تهران", rating: 5, comment: "سفارشم زودتر از زمان اعلام‌شده رسید. کیفیت دوخت و گلدوزی فوق‌العاده است و دقیقاً اندازه کف ماشین بود. واقعاً به این تولید ایرانی افتخار می‌کنم." },
  { name: "مرتضی کشاورز", city: "شیراز", rating: 5, comment: "همیشه دغدغه کفپوشی داشتم که اندازه باشد. این کفپوش کاملاً فیت است و هیچ مانعی برای پدال‌ها ایجاد نمی‌کند. برای ماشین دومم هم سفارش می‌دهم." },
  { name: "الهام مددی", city: "اصفهان", rating: 5, comment: "بین همه فروشگاه‌هایی که خرید کردم، ۵۰۵۰۰ سریع‌ترین ارسال را داشت. بسته‌بندی هم خیلی شیک و حرفه‌ای بود." },
  { name: "میلاد موسوی", city: "مشهد", rating: 5, comment: "تیم پشتیبانی با حوصله راهنمایی کردند تا بهترین ترکیب رنگ چرم و گلدوزی را انتخاب کنم. نتیجه از عکس‌ها هم قشنگ‌تر شد." },
  { name: "نیلوفر احمدی", city: "کرج", rating: 5, comment: "چرم کرم با گلدوزی قهوه‌ای را انتخاب کردم؛ نمونه رنگی که در سایت دیدم دقیقاً با محصول تحویلی یکی بود. خیلی شیک شد!" },
  { name: "امیرحسین رضایی", city: "تبریز", rating: 4, comment: "کیفیت چرم و دوخت خیلی خوب است. فقط یک روز دیرتر از زمان اعلام‌شده رسید که با این کیفیت اصلاً مهم نیست." },
  { name: "رضا کریمی", city: "رشت", rating: 5, comment: "در فصل بارندگی رشت، لبه‌های بلند کفپوش آب و گل را کامل نگه می‌دارد و با یک دستمال نم‌دار تمیز می‌شود. کاملاً بی‌بو هم هست." },
  { name: "زهرا حسینی", city: "قم", rating: 5, comment: "گلدوزی لوگوی ماشین خیلی تمیز و دقیق انجام شده. هر کس سوار ماشینم می‌شود درباره کفپوش سؤال می‌کند!" },
  { name: "محمد صادقی", city: "اهواز", rating: 5, comment: "در گرمای اهواز هیچ تغییر شکل یا بویی نداشت. کیفیت ساخت واقعاً درجه یک است و ارزش خرید دارد." },
  { name: "فاطمه نوری", city: "یزد", rating: 4, comment: "خیلی راضی‌ام و نصبش هم خیلی آسان بود. در کل عالی است و به دوستانم هم پیشنهاد کرده‌ام." },
  { name: "علی محمدی", city: "تهران", rating: 5, comment: "برای هر دو ماشینم سفارش دادم؛ یکی مشکی با گلدوزی قرمز و یکی زرشکی با گلدوزی طلایی. هر دو عالی و دقیقاً اندازه‌اند." },
  { name: "مریم کاظمی", city: "ساری", rating: 5, comment: "قبلاً کفپوش تقلبی خریده بودم که بعد از دو ماه خراب شد. این یکی بعد از یک سال هنوز مثل روز اول است و گارانتی هم دارد." },
];

export const DEMO_CUSTOMERS = [
  { name: "حسین مرادی", phone: "09121234567", province: "تهران", city: "تهران", address: "خیابان ولیعصر، کوچه نسترن، پلاک ۱۲", shipping: "post", payment: "paid", status: "delivered", hoursAgo: 150 },
  { name: "سارا عباسی", phone: "09351112233", province: "اصفهان", city: "اصفهان", address: "خیابان چهارباغ بالا، مجتمع آفتاب، واحد ۴", shipping: "tipax", payment: "paid", status: "delivered", hoursAgo: 128 },
  { name: "کامران شریفی", phone: "09137778899", province: "فارس", city: "شیراز", address: "بلوار چمران، کوچه ۱۸، پلاک ۶", shipping: "post", payment: "paid", status: "shipped", hoursAgo: 102 },
  { name: "مینا رستمی", phone: "09194445566", province: "البرز", city: "کرج", address: "گوهردشت، بلوار موذن، پلاک ۴۲", shipping: "post", payment: "cod", status: "shipped", hoursAgo: 80 },
  { name: "بهزاد نیک‌نام", phone: "09151239876", province: "خراسان رضوی", city: "مشهد", address: "بلوار سجاد، خیابان بهار، پلاک ۹", shipping: "tipax", payment: "paid", status: "producing", hoursAgo: 60 },
  { name: "لیلا قاسمی", phone: "09112223344", province: "گیلان", city: "رشت", address: "خیابان گلسار، کوچه ۱۰۵، پلاک ۳", shipping: "post", payment: "paid", status: "producing", hoursAgo: 44 },
  { name: "پیمان اکبری", phone: "09143334455", province: "آذربایجان شرقی", city: "تبریز", address: "خیابان ولیعصر، کوچه طالقانی، پلاک ۲۷", shipping: "post", payment: "paid", status: "confirmed", hoursAgo: 26 },
  { name: "نازنین طاهری", phone: "09125556677", province: "تهران", city: "تهران", address: "سعادت‌آباد، خیابان سرو غربی، پلاک ۸۸", shipping: "pickup", payment: "cod", status: "pending", hoursAgo: 9 },
  { name: "آرش فرهادی", phone: "09381230000", province: "قم", city: "قم", address: "بلوار امین، کوچه ۲۴، پلاک ۱۵", shipping: "post", payment: "pending", status: "pending", hoursAgo: 3 },
];

export const DEMO_ORDER_CODES = DEMO_CUSTOMERS.map((_, i) => String(40001234 + i * 7919));
