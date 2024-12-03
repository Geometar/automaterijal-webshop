import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, Output, SimpleChanges, ViewChild } from '@angular/core';
import { AutomLabelComponent } from '../autom-label/autom-label.component';

// Angular material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { SizeEnum } from '../../data-models/enums';
import { IconModel } from '../../data-models/interface';

@Component({
  selector: 'app-text-area',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AutomLabelComponent,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule],
  templateUrl: './text-area.component.html',
  styleUrl: './text-area.component.scss'
})
export class TextAreaComponent {
  @Input() autofocus = false;
  @Input() cols = 30;
  @Input() counter = false;
  @Input() disableInput = false;
  @Input() height = SizeEnum.SMALL;
  @Input() hint = '';
  @Input() label = '';
  @Input() labelIcons: Array<IconModel> = [];
  @Input() labelSize = SizeEnum.LARGE;
  @Input() maxLength = 256;
  @Input() name = 'name';
  @Input() placeholder = 'WRITE_HERE';
  @Input() readonly = false;
  @Input() required = false;
  @Input() rows = 10;
  @Input() selector = '';
  @Input() value = '';
  @Output() emitSelected = new EventEmitter<string>();
  @ViewChild('textAreaField') textAreaField: any;

  // Enums
  sizeEnum = SizeEnum;

  init = true;

  textForm = new UntypedFormGroup({
    textArea: new UntypedFormControl({
      value: '',
      disabled: this.disableInput
    })
  });

  get inputError(): boolean {
    return (
      (this.required && !this.textArea && !this.init) ||
      (!this.textForm?.valid && !(this.required && !this.textArea)) ||
      this.textAreaField?.value?.length === this.maxLength
    );
  }

  get textArea(): string {
    return this.textForm.get('textArea')?.value;
  }

  set textArea(value: string) {
    this.textForm.get('textArea')!.setValue(value);
  }

  get textAreaError(): boolean {
    return !this.disableInput && !this.textForm.valid && !(this.required && !this.textArea);
  }

  get textAreaRequired(): boolean {
    return this.required && !this.textArea && !this.init;
  }

  get textAreaSize(): string {
    return 'autom-text-area__' + this.height;
  }

  constructor(private cdRef: ChangeDetectorRef) { }

  ngOnChanges(changes: SimpleChanges): void {
    this.textArea = changes['value']?.currentValue ?? this.textArea;
    if (changes['disableInput']) {
      if (changes['disableInput'].currentValue) {
        this.textForm.get('textArea')?.disable();
      } else {
        this.textForm.get('textArea')?.enable();
      }
    }
  }

  ngAfterViewInit(): void {
    if (this.value) {
      this.textArea = this.value;
    }

    if (this.disableInput) {
      this.textForm.get('textArea')?.disable();
    }

    this.cdRef.detectChanges();
  }

  onTextAreaChange(): void {
    this.emitSelected.next(this.textArea);
    this.init = false;
  }
}
