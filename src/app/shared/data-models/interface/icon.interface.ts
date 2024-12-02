// Interface
import { TooltipModel } from './tooltip.interface';

// Enums
import { ColorEnum, IconsEnum } from '../enums';

// Enums

export interface IconModel {
  action?: string;
  class?: string;
  color?: ColorEnum;
  disabled?: boolean;
  label?: string;
  svg: IconsEnum;
  title?: string;
  tooltip?: TooltipModel;
}
