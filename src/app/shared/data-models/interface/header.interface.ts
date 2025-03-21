// Data models
import { ButtonInfo } from './button.interface';

// Enums
import { TooltipPositionEnum, TooltipSubPositionsEnum, TooltipTypesEnum } from '../enums';

export interface HeaderData {
	titleInfo: {
		title: string;
		titleIcon?: string;
		tooltip?: {
			content?: any;
			position?: TooltipPositionEnum;
			subPosition?: TooltipSubPositionsEnum;
			theme?: string;
			tooltipText?: string;
			type?: TooltipTypesEnum;
		};
	};
	subtitle?: string;
	actions?: {
		buttons?: Array<ButtonInfo>;
		notifications?: NotificationBell;
	};
}

export interface NotificationBell {
	count: number;
	icon: string;
	items?: Array<string>;
}
