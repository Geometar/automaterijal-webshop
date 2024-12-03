// Enums
import { ButtonThemes, ButtonTypes, PositionEnum } from '@storybook/enums';

export interface ButtonCounter {
	position?: PositionEnum;
	showCounter: boolean;
	value: number;
}

export interface ButtonInfo {
	action?: string;
	disabled?: boolean;
	iconPrefix?: boolean;
	iconSource?: string;
	label?: string;
	theme?: ButtonThemes;
	type?: ButtonTypes;
}
