import { ColorEnum } from "../enums";


export interface SelectAlert {
	color: ColorEnum;
	source: string;
	tooltipContent: string;
}

export interface SelectModel {
	boldValue?: string;
	color?: ColorEnum;
	controlName?: string;
	countryCode?: string;
	dirty?: boolean;
	disabled?: boolean;
	flag?: string;
	// Used for specifying for which values the element should be hidden
	hideFor?: Array<string>;
	icon?: string;
	key?: string;
	type?: SelectCustomTypeEnum;
	// object to hold any data required by the custom type
	typeData?: any;
	value?: string;
}
