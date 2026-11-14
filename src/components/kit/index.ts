// 부품 상자(kit) — 디자인 A의 작은 조작 부품(docs/design/build-plan.md 패키지 K). 웨이브 2부터 화면은 여기서 고른다.
// 색은 팔레트(M)의 토큰 이름으로만, 글자는 ROLE(theme/type.ts) · KIT_TYPE(./metrics), 자리는 ./metrics.
export { CheckBox, type CheckBoxProps, type CheckPaint } from './CheckBox';
export { Row, RowMeta, RowRight, RowRule, RowTitle, type RowProps } from './Row';
export { DyeMark } from './DyeMark';
export { Section, TextLink } from './Section';
export { Segment, segmentFace, segmentRoles, type SegOption } from './Segment';
export { Field, type FieldButton, type FieldProps } from './Field';
export { ChoiceRow, ChoiceTick } from './ChoiceRow';
export { TimeChip, ToggleRow } from './ToggleRow';
export { LinkRow } from './LinkRow';
export { DayBoxes, type DayBoxesProps } from './DayBoxes';
export { AreaPicker } from './AreaPicker';
export { FilterLine, type FilterItem } from './FilterLine';
export { Swatch, type SwatchKind } from './Swatch';
export {
  AREA, CHIP, CHOICE, COUNT_BAR, DAYS, DYE, FIELD, FILTER, KIT_TYPE, ROW, SECTION, SEG, SWATCH,
  hitFor, lookPages, rowInset, segmentCells, strikeBox, strikeTop, type PageInk,
} from './metrics';
export {
  CHOICE_TICK, CHOSEN_TICK, PEN_TICK, checkGeometry, dayBoxStates, isChecked,
  type CheckSize, type CheckState, type DayBox,
} from '../../lib/marks';
