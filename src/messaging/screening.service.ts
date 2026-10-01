import { Injectable } from '@nestjs/common';
import { RiskCategory, ScreeningRule } from './messaging.types';

export interface ScreeningMatch {
  rule: ScreeningRule;
  evidenceMasked: string;
}

const TURKISH_DIGIT_WORDS: Record<string, string> = {
  sıfır: '0',
  sifir: '0',
  bir: '1',
  iki: '2',
  üç: '3',
  uc: '3',
  dört: '4',
  dort: '4',
  beş: '5',
  bes: '5',
  altı: '6',
  alti: '6',
  yedi: '7',
  sekiz: '8',
  dokuz: '9',
};

const ENGLISH_DIGIT_WORDS: Record<string, string> = {
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9',
};

const ARABIC_DIGIT_WORDS: Record<string, string> = {
  صفر: '0', واحد: '1', اثنان: '2', اثنين: '2', ثلاثة: '3', أربع: '4',
  أربعة: '4', خمس: '5', خمسة: '5', ست: '6', ستة: '6', سبع: '7', سبعة: '7',
  ثمان: '8', ثمانية: '8', تسع: '9', تسعة: '9',
};

const DIGIT_MAP: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

export function normalizeForScreening(content: string): string {
  return content
    .normalize('NFKC')
    .toLocaleLowerCase('tr-TR')
    .replace(/[٠-٩۰-۹]/gu, (digit) => DIGIT_MAP[digit] ?? digit)
    .normalize('NFKC');
}

function wordDigitSequence(content: string): string | undefined {
  const normalized = normalizeForScreening(content)
    .replace(/[.,/()\-_+]/g, ' ')
    .split(/\s+/u)
    .filter(Boolean);
  const words = { ...TURKISH_DIGIT_WORDS, ...ENGLISH_DIGIT_WORDS, ...ARABIC_DIGIT_WORDS };
  const digits = normalized.map((word) => words[word]).filter((digit): digit is string => Boolean(digit));
  return digits.length >= 7 ? digits.join('') : undefined;
}

function digitSequence(content: string): string | undefined {
  const normalized = normalizeForScreening(content);
  const digits = normalized.replace(/\D/gu, '');
  return digits.length >= 7 && digits.length <= 15 ? digits : undefined;
}

function mask(category: RiskCategory): string {
  return `[${category.toLowerCase()}]`;
}

export function defaultScreeningRules(now = new Date().toISOString()): ScreeningRule[] {
  const rule = (id: string, category: RiskCategory, name: string): ScreeningRule => ({
    id,
    version: 1,
    category,
    name,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  });

  return [
    rule('screen-contact-phone-v1', 'CONTACT_PHONE', 'Phone-like sequence'),
    rule('screen-contact-email-v1', 'CONTACT_EMAIL', 'Email address'),
    rule('screen-external-channel-v1', 'EXTERNAL_CHANNEL', 'External communication channel'),
    rule('screen-external-url-v1', 'EXTERNAL_URL', 'External URL'),
    rule('screen-payment-iban-v1', 'PAYMENT_OR_IBAN', 'IBAN/payment reference'),
    rule('screen-obfuscated-contact-v1', 'OBFUSCATED_CONTACT', 'Obfuscated contact sequence'),
    rule('screen-spam-abuse-v1', 'SPAM_OR_ABUSE', 'Spam or abuse keyword'),
  ];
}

@Injectable()
export class ScreeningService {
  scan(content: string, rules: ScreeningRule[]): ScreeningMatch[] {
    const normalized = normalizeForScreening(content);
    const matches: ScreeningMatch[] = [];
    const phone = digitSequence(content);
    const words = wordDigitSequence(content);
    const email = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu.test(content);
    const url = /\b(?:https?:\/\/|www\.)[^\s]+/iu.test(content);
    const iban = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/iu.test(normalized.replace(/[\s-]/gu, ''));
    const external = /(?:whats?app|telegram|signal|wechat|instagram|wa\.me|t\.me)/iu.test(normalized);
    const spam = /(?:spam|dolandır|dolandir|scam|hakaret)/iu.test(normalized);

    for (const rule of rules.filter((item) => item.enabled)) {
      let matched = false;
      switch (rule.category) {
        case 'CONTACT_PHONE':
          matched = Boolean(phone);
          break;
        case 'CONTACT_EMAIL':
          matched = email;
          break;
        case 'EXTERNAL_URL':
          matched = url;
          break;
        case 'PAYMENT_OR_IBAN':
          matched = iban;
          break;
        case 'EXTERNAL_CHANNEL':
          matched = external;
          break;
        case 'OBFUSCATED_CONTACT':
          matched = Boolean(words);
          break;
        case 'SPAM_OR_ABUSE':
          matched = spam;
          break;
        case 'OTHER_CONFIGURED_KEYWORD':
          matched = Boolean(rule.pattern && normalized.includes(normalizeForScreening(rule.pattern)));
          break;
      }
      if (matched) {
        matches.push({ rule, evidenceMasked: mask(rule.category) });
      }
    }
    return matches;
  }
}
