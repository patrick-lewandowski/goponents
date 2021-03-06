import { Component, ContentChild, Input, OnInit, TemplateRef, ViewEncapsulation } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { generateId } from '../../utilities/form.utils';

@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'go-select',
  templateUrl: './go-select.component.html',
  styleUrls: ['./go-select.component.scss']
})
export class GoSelectComponent implements OnInit {
  id: string;

  @Input() appendTo: string;
  @Input() bindLabel: string;
  @Input() bindValue: string;
  @Input() clearable: boolean = true;
  @Input() control: FormControl;
  /**
   * A property on each item to group by
   */
  @Input() groupBy: string = null;
  @Input() hints: string[];
  @Input() items: any[];
  @Input() key: string;
  @Input() label: string;
  @Input() loading: boolean = false;
  @Input() multiple: boolean = false;
  @Input() placeholder: string;
  @Input() searchable: boolean = true;
  @Input() showSelectAll: boolean = true;
  @Input() typeahead?: Subject<string>;
  @Input() typeToSearchText: string = 'Type to Search';
  @Input() theme: 'light' | 'dark' = 'light';

  @ContentChild('goSelectOption', { static: false }) goSelectOption: TemplateRef<any>;
  @ContentChild('goSelectOptionGroup', { static: false }) goSelectOptionGroup: TemplateRef<any>;
  @ContentChild('goSelectSelectedOption', { static: false }) goSelectSelectedOption: TemplateRef<any>;

  ngOnInit(): void {
    this.id = this.key || generateId(this.label, 'select');
  }

  onSelectAll(): void {
    this.control.patchValue(this.items.map((item: any) => this.bindValue ? item[this.bindValue] : item));
  }
}
