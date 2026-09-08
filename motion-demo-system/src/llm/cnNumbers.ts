/**
 * 汉字数字 → 阿拉伯数字规范化。
 *
 * 覆盖口播/字幕中最常见的表达：
 *   - 整数：一百五十 → 150、三千二百零八 → 3208、十五万 → 150000、三十 → 30
 *   - 小数：八点五 → 8.5、零点五 → 0.5
 *   - 百分比：百分之二十 → 20%
 *
 * 保守策略避免误伤自然语言：
 *   - 单个汉字数字且不带单位/小数点时不转换（保留“第一、三思、两人”中的数字字）。
 *   - 纯数字串（无 十/百/千/万/亿/点 等结构词）不转换，避免“一二三、五二零”等列举/谐音被破坏。
 *   - 解析失败（如“三十而立”这类与单位混用的成语场景之外的不规则串）原样保留。
 */
const DIGIT: Record<string, number> = {
  零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
};

const NUMBER_TOKEN = '[零〇一二两三四五六七八九]';
const STRUCTURE_TOKEN = '十百千万亿点';
// 以单个汉字数字或“十/百/千/万”起头的候选段；解析器随后决定是否值得转换。
const CANDIDATE_RE = new RegExp(`[零〇一二两三四五六七八九十百千万][零〇一二两三四五六七八九${STRUCTURE_TOKEN}]*`, 'g');
const PERCENT_RE = new RegExp(`百分之([零〇一二两三四五六七八九十百千万亿点]+)`, 'g');

/**
 * 后随这些字时，单个汉字数字按计数读（“五种/十种/三项”），可安全改写为阿拉伯；
 * 不在集合内的单字数字（“三思/十分感谢/两人/第一届”）按自然语言保留。
 */
const QUANTIFIER_SUFFIX = '个种套款项条类别层组份件台次批名位岁亩轮张封包盒版';

/** 判断候选段是否值得转换：多字须含结构词；单字须后随计数量词。 */
function shouldConvert(candidate: string, tail: string): boolean {
  if (candidate.length >= 2) return /[十百千万亿点]/.test(candidate);
  return tail.length > 0 && QUANTIFIER_SUFFIX.includes(tail[0]);
}

/** 解析一个不含“点”的整数段（支持 十百千万亿 嵌套），失败返回 null。 */
function parseIntegerSegment(segment: string): number | null {
  if (!segment) return null;
  let result = 0;   // 已结算部分（亿级 + 已并入的万级）
  let section = 0;  // 当前“十百千”内的累积
  let digit = 0;    // 待挂载的数字
  let hasDigit = false;

  const carrySmallUnit = (unit: number) => {
    // 中文习惯允许“十五”“两百”省略开头的“一”
    section += (digit === 0 && !hasDigit ? 1 : digit) * unit;
    digit = 0;
    hasDigit = false;
  };

  for (const ch of segment) {
    const d = DIGIT[ch];
    if (d !== undefined) {
      digit = d;
      hasDigit = true;
      continue;
    }
    if (ch === '点') break; // 防御性截断，不应走到
    if (ch === '十') { carrySmallUnit(10); continue; }
    if (ch === '百') { carrySmallUnit(100); continue; }
    if (ch === '千') { carrySmallUnit(1000); continue; }
    if (ch === '万') {
      // 万级直接结算为独立的一层，避免后续再出现的“亿”被重复放大
      result += (section + (hasDigit ? digit : 0)) * 10000;
      section = 0;
      digit = 0;
      hasDigit = false;
      continue;
    }
    if (ch === '亿') {
      result = (result + section + (hasDigit ? digit : 0)) * 100000000;
      section = 0;
      digit = 0;
      hasDigit = false;
      continue;
    }
    return null;
  }
  return result + section + (hasDigit ? digit : 0);
}

/** 解析带“点”的候选段为数值，失败返回 null。 */
function parseDecimalSegment(segment: string): number | null {
  const [whole, ...rest] = segment.split('点');
  if (rest.length === 0) return parseIntegerSegment(whole);
  if (rest.length > 1) return null; // 出现多个“点”视为非数字
  const intPart = whole.trim() ? parseIntegerSegment(whole) : 0;
  if (intPart === null) return null;
  const frac = rest[0].trim();
  if (!frac) return null;
  let value = 0;
  let place = 0.1;
  for (const ch of frac) {
    const d = DIGIT[ch];
    if (d === undefined) return null;
    value += d * place;
    place /= 10;
  }
  return intPart + value;
}

/** 判断候选段是否值得转换：必须含结构词（单位或小数点），否则保留。 */
const render = (value: number): string => (
  // 整数输出不带小数点；避免超大数被 JS 写成科学计数法
  Number.isInteger(value)
    ? value.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 0 })
    : String(Math.round(value * 1e6) / 1e6)
);

/** 把一段文本里的汉字数字改写为阿拉伯数字。 */
export function convertCnNumerals(text: string): string {
  if (!text) return text;
  const percentConverted = text.replace(
    PERCENT_RE,
    (_match, segment: string) => {
      if (!segment) return _match;
      const value = parseDecimalSegment(segment);
      return value === null ? _match : `${render(value)}%`;
    },
  );
  return percentConverted.replace(
    CANDIDATE_RE,
    (candidate, _offset, whole) => {
      const tail = whole.slice(_offset + candidate.length);
      if (!shouldConvert(candidate, tail)) return candidate;
      const value = candidate.includes('点')
        ? parseDecimalSegment(candidate)
        : parseIntegerSegment(candidate);
      if (value === null || !Number.isFinite(value)) return candidate;
      return render(value);
    },
  );
}
