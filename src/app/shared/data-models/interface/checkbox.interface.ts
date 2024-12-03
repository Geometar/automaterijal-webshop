import { BadgeTypeEnum } from '@storybook/enums';

export interface CheckboxModel {
	all?: boolean;
	badge?: BadgeTypeEnum;
	checked: boolean;
	controlName?: string;
	disabled?: boolean;
	indeterminate?: boolean;
	key?: string;
	required?: boolean;
	value: string;
}
