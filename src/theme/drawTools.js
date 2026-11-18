import {
  PencilToolIcon,
  MarkerToolIcon,
  HighlighterToolIcon,
  BrushToolIcon,
  EraserToolIcon,
} from '../components/ToolIcons';

export const DRAW_TOOLS = [
  { id: 'pencil', label: 'Crayon', Icon: PencilToolIcon, sizes: [2, 4, 7], opacity: 1 },
  { id: 'marker', label: 'Feutre', Icon: MarkerToolIcon, sizes: [5, 9, 14], opacity: 1 },
  { id: 'highlighter', label: 'Surligneur', Icon: HighlighterToolIcon, sizes: [12, 18, 26], opacity: 0.35 },
  { id: 'brush', label: 'Pinceau', Icon: BrushToolIcon, sizes: [8, 14, 22], opacity: 0.9 },
  { id: 'eraser', label: 'Gomme', Icon: EraserToolIcon, sizes: [12, 18, 26], opacity: 1 },
];
