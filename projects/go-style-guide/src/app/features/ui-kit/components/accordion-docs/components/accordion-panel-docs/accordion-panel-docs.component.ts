import { Component } from '@angular/core';
import { SubNavService } from 'projects/go-style-guide/src/app/shared/components/sub-nav/sub-nav.service';

@Component({
  selector: 'app-accordion-panel-docs',
  templateUrl: './accordion-panel-docs.component.html'
})
export class AccordionPanelDocsComponent {

  pageTitle: string;

  defaultExample: string = `
  <go-accordion>
    <go-accordion-panel heading="Test 1" [expanded]="true">
      This is some content for Test 1.
    </go-accordion-panel>
    <go-accordion-panel heading="Test 2">
      This is a second thing.
    </go-accordion-panel>
    <go-accordion-panel heading="Test 3">
      This is a third thing.
    </go-accordion-panel>
  </go-accordion>
  `;

  showIconsExample: string = `
  <go-accordion [showIcons]="true">
    <go-accordion-panel heading="Test 1" icon="home" [expanded]="true">
      This is some content for Test 1.
    </go-accordion-panel>
    <go-accordion-panel heading="Test 2" icon="settings">
      This is a second thing.
    </go-accordion-panel>
    <go-accordion-panel heading="Test 3" icon="landscape">
      This is a third thing.
    </go-accordion-panel>
  </go-accordion>
  `;

  delayedLoadingExample: string = `
  <go-accordion>
    <go-accordion-panel heading="Not Delayed">
      <app-loading-test></app-loading-test>
    </go-accordion-panel>
    <go-accordion-panel heading="Delay Loading">
      <ng-template #panelContent>
        <app-loading-test></app-loading-test>
      </ng-template>
    </go-accordion-panel>
    <go-accordion-panel heading="Don't Persist State" [persistState]="false">
      <ng-template #panelContent>
        <app-loading-test></app-loading-test>
      </ng-template>
    </go-accordion-panel>
  </go-accordion>
  `;

  appLoadingTestExample: string = `
  @Component({
    selector: 'app-loading-test',
    template: ''
  })
  export class LoadingTestComponent {
    constructor(private toasterService: GoToasterService) {
      this.toasterService.toastSuccess({ message: 'Component loaded' });
    }
  }
  `;

  componentBindings: string = `
  @Input() expanded:  boolean = false;
  @Input() icon:      string  = null;
  @Input() heading:     string;
  `;

  constructor(private subNavService: SubNavService) {
    this.subNavService.pageTitle = 'Accordion Panel';
  }
}
