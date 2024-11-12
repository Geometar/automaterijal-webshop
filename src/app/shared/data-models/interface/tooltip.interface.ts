import { TooltipPositionEnum, TooltipSubPositionsEnum, TooltipThemeEnum, TooltipTypesEnum } from "../enums";


export interface TooltipModel {
	position?: TooltipPositionEnum;
	showDelay?: number;
	subPosition?: TooltipSubPositionsEnum;
	theme?: TooltipThemeEnum;
	tooltipDisabled?: boolean;
	tooltipText?: any;
	type?: TooltipTypesEnum;
}
