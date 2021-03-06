import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ContentChildren,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  QueryList,
  SimpleChanges,
  TemplateRef,
  ViewChild
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { GoTableColumnComponent } from './go-table-column.component';
import {
  GoTableConfig,
  GoTableDataSource,
  GoTablePageConfig,
  GoTableSortConfig,
  RowSelectionEvent,
  SelectionMode,
  SelectionState,
  SortDirection
} from './index';
import { sortBy } from './go-table-utils';
import { fadeTemplateAnimation } from '../../animations/fade.animation';
import { detailButtonAnim, tableRowBorderAnim } from '../../animations/table-details.animation';
import { GoTablePage } from './go-table-page.model';

@Component({
  animations: [
    detailButtonAnim,
    tableRowBorderAnim,
    fadeTemplateAnimation
  ],
  selector: 'go-table',
  templateUrl: './go-table.component.html',
  styleUrls: ['./go-table.component.scss']
})
export class GoTableComponent implements OnInit, OnChanges, AfterViewInit {

  @Input() loadingData: boolean = false;
  @Input() maxHeight: string;
  @Input() renderBoxShadows: boolean = true;
  @Input() showTableActions: boolean = false;
  @Input() tableConfig: GoTableConfig;
  @Input() tableTitle: string;

  /**
   * This event is emitted when a row's selection changes
   * @returns a `GoTableRowSelectionEvent` object.
   * - `currentRow` is the targeted row
   * - `selectedRows` are the currently selected rows if the `selectionMode` is `selection`
   * - `selectionMode` is a `GoTableSelectionMode` enum of either `selection` or `deselection`
   * - `deselectedRows` are the currently deselected rows if the `selectionMode` is `deselection`
   */
  @Output() rowSelectionEvent: EventEmitter<RowSelectionEvent> = new EventEmitter<RowSelectionEvent>();
  @Output() tableChange: EventEmitter<GoTableConfig> = new EventEmitter<GoTableConfig>();

  @ContentChildren(GoTableColumnComponent) columns: QueryList<GoTableColumnComponent>;
  @ContentChild('goTableDetails', { static: false }) details: TemplateRef<any>;
  @ContentChild('goTableTitle', { static: false }) tableTitleTemplate: TemplateRef<any>;

  @ViewChild('selectAllCheckbox', { static: false }) selectAllCheckbox: ElementRef;

  allData: any[] = [];
  localTableConfig: GoTableConfig;
  pages: GoTablePage[] = [];
  pageSizeControl: FormControl = new FormControl();
  searchTerm: FormControl = new FormControl();
  selectAllChecked: boolean = false;
  showTable: boolean = false;
  targetedRows: any[] = [];

  constructor(private changeDetector: ChangeDetectorRef) { }

  ngOnInit(): void {
    if (!this.tableConfig) {
      throw new Error('GoTableComponent: tableConfig is a required Input');
    } else {
      // we have to do call setupSearch here because it creates a subscription
      // if we call it in ngOnChanges it will create a new subscription
      // everytime ngOnChanges is triggered, which is not good
      this.setupSearch();
      this.setupPageSizes();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.tableConfig) {
      this.renderTable();
    }
  }

  ngAfterViewInit(): void {
    if (this.tableConfig.preselected) {
      this.toggleSelectAll();
      this.changeDetector.detectChanges();
    }

    if (!this.isServerMode() && this.localTableConfig.searchConfig.searchable) {
      if (this.localTableConfig.searchConfig.searchTerm && this.localTableConfig.searchConfig.searchTerm !== '') {
        this.performSearch(this.localTableConfig.searchConfig.searchTerm.toLowerCase());
        this.changeDetector.detectChanges();
      }
    }
  }

  renderTable(): void {
    if (this.tableConfig) {
      this.localTableConfig = JSON.parse(JSON.stringify(this.tableConfig));

      this.allData = this.localTableConfig.tableData;
      this.setTotalCount();
      this.handleSort();
      this.setPage(this.localTableConfig.pageConfig.offset);
      this.setSearchTerm();
    }

    this.showTable = Boolean(this.tableConfig);
  }

  hasData(): boolean {
    if (this.localTableConfig && this.localTableConfig.tableData) {
      return Boolean(this.localTableConfig.tableData.length);
    }

    return false;
  }

  sortIcons(columnField: string): string {
    if (this.sortClasses(columnField, SortDirection.ascending)) {
      return 'arrow_upward';
    } else if (this.sortClasses(columnField, SortDirection.descending)) {
      return 'arrow_downward';
    }
  }

  showPaging(): boolean {
    return this.hasData() && this.localTableConfig.pageable;
  }

  toggleSort(columnSortable: boolean, columnField: string): void {
    const { sortable, sortConfig, tableData }:
    {
      sortable: boolean,
      sortConfig?: GoTableSortConfig,
      tableData: any[]
    } = this.localTableConfig;

    columnSortable = columnSortable !== undefined ? columnSortable : sortable;

    if (tableData && columnSortable) {
      if (sortConfig && sortConfig.column === columnField) {
        this.localTableConfig.sortConfig.direction = this.toggleSortDir(sortConfig.direction);
      } else {
        this.localTableConfig.sortConfig = { column: columnField, direction: SortDirection.ascending };
      }

      this.setPage();

      this.tableChangeOutcome();
      if (!this.isServerMode()) {
        this.handleSort();
      }
    }
  }

  nextPage(): void {
    this.setPage(this.localTableConfig.pageConfig.offset + this.localTableConfig.pageConfig.perPage);

    this.tableChangeOutcome();
  }

  isLastPage(): boolean {
    const { pageConfig, tableData, totalCount }:
    {
      pageConfig: GoTablePageConfig,
      tableData: any[],
      totalCount: number
    } = this.localTableConfig;

    return ((pageConfig.offset + pageConfig.perPage) >= tableData.length) && ((pageConfig.offset + pageConfig.perPage) >= totalCount);
  }

  setLastPage(): void {
    const { pageConfig, totalCount }:
    {
      pageConfig: GoTablePageConfig,
      totalCount: number
    } = this.localTableConfig;

    const offset: number = totalCount - (totalCount % pageConfig.perPage);
    this.setPage(offset === totalCount ? totalCount - pageConfig.perPage : offset);

    this.tableChangeOutcome();
  }

  prevPage(): void {
    this.setPage(this.localTableConfig.pageConfig.offset - this.localTableConfig.pageConfig.perPage);

    this.tableChangeOutcome();
  }

  isFirstPage(): boolean {
    return this.localTableConfig.pageConfig.offset === 0;
  }

  setFirstPage(): void {
    this.setPage();

    this.tableChangeOutcome();
  }

  setupPageSizes(): void {
    this.pageSizeControl.setValue(this.localTableConfig.pageConfig.perPage);

    this.pageSizeControl.valueChanges.subscribe((value: number) => {
      this.localTableConfig.pageConfig.perPage = value;
      this.setPage();
      this.tableChangeOutcome();
    });
  }

  outputResultsPerPage(): string {
    const { pageConfig, totalCount }:
    {
      pageConfig: GoTablePageConfig,
      totalCount: number
    } = this.localTableConfig;

    const beginning: number = this.localTableConfig.pageConfig.offset + 1;
    const endingEstimate: number = pageConfig.offset + pageConfig.perPage;
    const ending: number = endingEstimate <= totalCount ? endingEstimate : totalCount;

    return beginning + ' - ' + ending;
  }

  setDisplayData(): any[] {
    const { pageConfig, tableData }:
    {
      pageConfig: GoTablePageConfig,
      tableData: any[]
    } = this.localTableConfig;

    // show all data when in server mode or paging is disabled
    if (this.isServerMode() || !this.showPaging()) {
      return tableData;
    } else {
      return tableData.slice(pageConfig.offset, pageConfig.offset + pageConfig.perPage);
    }
  }

  getSelectionCount(): number {
    if (this.determineSelectionMode() === SelectionMode.deselection) {
      return this.localTableConfig.totalCount - this.targetedRows.length;
    } else {
      return this.targetedRows.length;
    }
  }

  getSelectionState(): SelectionState {
    return {
      deselectedRows: this.selectAllChecked ? this.targetedRows : [],
      selectionMode: this.determineSelectionMode(),
      selectedRows: !this.selectAllChecked ? this.targetedRows : []
    };
  }

  toggleSelectAll(): void {
    this.targetedRows = [];
    this.selectAllChecked = !this.selectAllChecked;

    if (!this.selectAllChecked) {
      this.selectAllCheckbox.nativeElement.indeterminate = false;
    }
  }

  selectionChange(event: any, row: any): void {
    const index: number = this.targetedRows.indexOf(row);

    if (this.selectAllChecked) {
      if (event.target.checked && index >= 0) {
        this.targetedRows.splice(index, 1);
        if (this.targetedRows.length === 0) {
          this.selectAllCheckbox.nativeElement.indeterminate = false;
        }
      } else {
        this.targetedRows.push(row);
        this.selectAllCheckbox.nativeElement.indeterminate = true;
      }
    } else {
      if (event.target.checked && index < 0) {
        this.targetedRows.push(row);
      } else {
        this.targetedRows.splice(index, 1);
      }
    }

    this.rowSelectionEvent.emit({
      currentRow: {
        data: row,
        selected: event.target.checked
      },
      deselectedRows: this.selectAllChecked ? this.targetedRows : [],
      selectionMode: this.determineSelectionMode(),
      selectedRows: !this.selectAllChecked ? this.targetedRows : []
    });
  }

  isRowSelected(row: any): boolean {
    if (this.selectAllChecked && !this.isRowInTargeted(row)) {
      return true;
    } else if (!this.selectAllChecked && this.isRowInTargeted(row)) {
      return true;
    } else {
      return false;
    }
  }

  toggleDetails(row: any): void {
    row.showDetails = !row.showDetails;
  }

  setPageByPageNumber(pageNumber: number): void {
    this.setPage(this.localTableConfig.pageConfig.perPage * (pageNumber - 1));

    this.tableChangeOutcome();
  }

  clearSearch(): void {
    this.searchTerm.reset();
  }

  //#region Private Methods
  private handleSort(): void {
    const { sortConfig, sortable, tableData }:
    {
      sortConfig?: GoTableSortConfig,
      sortable: boolean,
      tableData: any[]
    } = this.localTableConfig;

    if (sortConfig && sortable && tableData && sortConfig.column) {
      this.localTableConfig.tableData.sort(sortBy(sortConfig.column, Boolean(sortConfig.direction)));
    }
  }

  private toggleSortDir(currDir: SortDirection): SortDirection {
    return currDir === SortDirection.ascending ? SortDirection.descending : SortDirection.ascending;
  }

  private sortClasses(columnField: string, direction: SortDirection): boolean {
    const { sortConfig }: { sortConfig?: GoTableSortConfig } = this.localTableConfig;

    return sortConfig && sortConfig.column === columnField && sortConfig.direction === direction;
  }

  private setTotalCount(): void {
    const { totalCount, tableData }:
    {
      totalCount: number,
      tableData: any[]
    } = this.localTableConfig;

    this.localTableConfig.totalCount = totalCount !== null ? totalCount : tableData.length;
  }

  private isServerMode(): boolean {
    return this.localTableConfig.dataMode === GoTableDataSource.server;
  }

  private tableChangeOutcome(): void {
    this.tableChange.emit(this.localTableConfig);
  }

  private determineSelectionMode(): SelectionMode {
    return this.selectAllChecked ? SelectionMode.deselection : SelectionMode.selection;
  }

  private isRowInTargeted(row: any): boolean {
    return this.targetedRows.find((i: any) => i[this.localTableConfig.selectBy] === row[this.localTableConfig.selectBy]);
  }

  private setPage(offset: number = 0): void {
    const { pageConfig, totalCount }:
    {
      pageConfig: GoTablePageConfig,
      totalCount: number
    } = this.localTableConfig;

    const lastPage: number = Math.ceil(totalCount / pageConfig.perPage);
    const currentPage: number = (pageConfig.perPage + offset) / pageConfig.perPage;
    const startPage: number = this.calculateStartPage(lastPage, currentPage);

    this.pages = [];

    for (let i: number = startPage; i < startPage + 5; i++) {
      if (i > lastPage) { break; }

      this.pages.push({
        number: i,
        active: i === currentPage
      });
    }

    this.localTableConfig.pageConfig.offset = offset;
  }

  private calculateStartPage(lastPage: number, currentPage: number): number {
    const pagesLeft: number = lastPage - currentPage;
    let startPage: number = currentPage - 2;

    if (startPage <= 1) {
      startPage = 1;
    }

    if (lastPage - startPage < 4) {
      startPage = currentPage - 4 + pagesLeft;
      if (startPage < 1) {
        startPage = 1;
      }
    }

    return startPage;
  }

  private setupSearch(): void {
    this.searchTerm.valueChanges.pipe(
      debounceTime(this.localTableConfig.searchConfig.debounce),
      distinctUntilChanged()
    ).subscribe((searchTerm: string) => {
      this.localTableConfig.searchConfig.searchTerm = searchTerm;
      if (!this.isServerMode()) {
        this.performSearch(searchTerm ? searchTerm.toLowerCase() : '');
      } else {
        this.setFirstPage();
      }
    });
    this.setSearchTerm();
  }

  private setSearchTerm(): void {
    if (this.localTableConfig.searchConfig.searchTerm) {
      this.searchTerm.setValue(this.localTableConfig.searchConfig.searchTerm);
    }
  }

  private performSearch(searchTerm: string): void {
    if (searchTerm) {
      this.loadingData = true;
      this.localTableConfig.tableData = this.allData.filter((row: any) => {
        return this.columns.some((column: GoTableColumnComponent) => {
          return column.searchable && column.getFieldData(row).toString().toLowerCase().indexOf(searchTerm) !== -1;
        });
      });
    } else {
      this.localTableConfig.tableData = this.allData;
    }

    this.localTableConfig.totalCount = this.localTableConfig.tableData.length;
    this.setFirstPage();
    this.loadingData = false;
  }
  //#endregion
}
