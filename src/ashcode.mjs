// AshCode / ORDER 937 is a deliberately conservative, local text transform.
// It is lossy, not encryption or a model tokenizer. Keep the original in the
// event log so the human can inspect what was actually abbreviated.

const SPANISH = /\b(?:el|la|los|las|un|una|unos|unas|para|proyecto|página|pagina|imagen|crear|genera|dentro)\b/gi;
const ENGLISH = /\b(?:the|a|an|for|project|page|image|create|generate|inside|please)\b/gi;
const PROTECTED = /"[^"\n]*"|'[^'\n]*'|@[\p{L}\p{N}_-]+|![\p{L}\p{N}_./:-]+/gu;
const RISKY = /```|`|https?:\/\/|\n|[{}<>]|\b(?:no|nunca|sin|excepto|not|never|without|except)\b|\d|(?:^|\s)(?:\.{1,2}\/|\/|[\w.-]+\/)[\w./-]+/iu;

export function ashLanguage(input) {
  const text = String(input ?? '');
  const es = (text.match(SPANISH) ?? []).length + (/[áéíóúñ¿¡]/i.test(text) ? 2 : 0);
  const en = (text.match(ENGLISH) ?? []).length;
  if (es === en || Math.max(es, en) < 2) return null;
  return es > en ? 'es' : 'en';
}

export function compressAshCode(input) {
  const original = String(input ?? '').trim();
  const unchanged = (reason) => ({ text: original, original, applied: false, reason, originalChars: original.length, encodedChars: original.length, language: null });
  if (!original) return unchanged('empty');
  if (RISKY.test(original) || /(?:^|\s)\/[A-Za-z_.]/.test(original)) return unchanged('protected-structure');
  const language = ashLanguage(original);
  if (!language) return unchanged('language-uncertain');

  const protectedSpans = [];
  let text = original.replace(PROTECTED, (span) => {
    const index = protectedSpans.push(span) - 1;
    return `\uE000${index}\uE001`;
  });

  if (language === 'es') {
    text = text
      .replace(/\b(?:yo\s+)?(?:quiero|necesito|quisiera)\s+que\s+/gi, '')
      .replace(/\bme gustaría que\s+/gi, '')
      .replace(/\bpor favor\b[,.]?\s*/gi, '')
      .replace(/\bdentro del?\b/gi, 'en')
      .replace(/\b(?:el|la|los|las|un|una|unos|unas)\s+/g, '')
      .replace(/\bhome de (?:la )?(?:página|pagina) principal\b/gi, 'home');
  } else {
    text = text
      .replace(/\bI (?:would like|want|need) you to\s+/gi, '')
      .replace(/\b(?:could|can) you\s+/gi, '')
      .replace(/\bplease\b[,.]?\s*/gi, '')
      .replace(/\binside of\b/gi, 'in')
      .replace(/\b(?:the|a|an)\s+/g, '')
      .replace(/\bhome page of (?:the )?main (?:web)?site\b/gi, 'home page');
  }

  text = text
    .replace(/\b([\p{L}]+)(?:\s+\1)+\b/giu, '$1')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/[.。]$/, '');
  text = text.replace(/\uE000(\d+)\uE001/g, (_, index) => protectedSpans[Number(index)]);
  const encoded = `ASH937/${language}: ${text}`;
  // A shorter character string is not proof of fewer model tokens. Refuse
  // marginal rewrites because the prefix itself may erase any gain.
  if (encoded.length > original.length - 8) return unchanged('no-safe-gain');
  return { text: encoded, original, applied: true, reason: null, originalChars: original.length, encodedChars: encoded.length, language };
}

export const ASHCODE_BETA_WARNING = 'AshCode beta: abbreviation can change meaning or cause errors. Review the original before relying on a result; character reduction is not verified token savings.';
