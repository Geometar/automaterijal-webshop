import { ColorEnum } from '@storybook/enums';

export interface RadioOption {
	alert?: RadioButtonAlert;
	checked?: boolean;
	disabled?: boolean;
	hidden?: boolean;
	key: string;
	subtitle?: string;
	value: string;
}

export interface RadioButtonAlert {
	color: ColorEnum;
	source: string;
	tooltipContent: string;
}
