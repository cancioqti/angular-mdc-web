import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  Directive,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  NgZone,
  OnDestroy,
  Output,
  QueryList,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { defer, merge, Observable, Subject } from 'rxjs';
import { filter, startWith, switchMap, take, takeUntil } from 'rxjs/operators';

import { toBoolean } from '@angular-mdc/web/common';

import { MdcListItem, MdcListSelectionChange } from './list-item';

import { MDCListAdapter } from '@material/list/adapter';
import { MDCListFoundation } from '@material/list/foundation';

/** Change event that is being fired whenever the selected state of an option changes. */
export class MdcListItemChange {
  constructor(
    /** Reference to the selection list that emitted the event. */
    public source: MdcList,
    /** Reference to the option that has been changed. */
    public option: MdcListItem) { }
}

@Directive({
  selector: '[mdcListGroup], mdc-list-group',
  exportAs: 'mdcListGroup',
})
export class MdcListGroup {
  @HostBinding('class.mdc-list-group') isHostClass = true;

  constructor(public elementRef: ElementRef) { }
}

@Directive({
  selector: '[mdcListGroupSubheader], mdc-list-group-subheader',
  exportAs: 'mdcListGroupSubheader',
})
export class MdcListGroupSubheader {
  @HostBinding('class.mdc-list-group__subheader') isHostClass = true;

  constructor(public elementRef: ElementRef) { }
}

@Component({
  moduleId: module.id,
  selector: '[mdcListDivider], mdc-list-divider',
  exportAs: 'mdcListDivider',
  template: '<div #divider class="mdc-list-divider" role="seperator"></div>',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MdcListDivider {
  @Input()
  get inset(): boolean { return this._inset; }
  set inset(value: boolean) {
    this._inset = toBoolean(value);
    this._inset ? this._divider.nativeElement.classList.add('mdc-list-divider--inset')
      : this._divider.nativeElement.classList.remove('mdc-list-divider--inset');
  }
  private _inset: boolean = false;

  @Input()
  get padded(): boolean { return this._padded; }
  set padded(value: boolean) {
    this._padded = toBoolean(value);
    this._padded ? this._divider.nativeElement.classList.add('mdc-list-divider--padded')
      : this._divider.nativeElement.classList.remove('mdc-list-divider--padded');
  }
  private _padded: boolean = false;

  @ViewChild('divider') _divider: ElementRef;
}

@Component({
  moduleId: module.id,
  selector: 'mdc-list',
  exportAs: 'mdcList',
  template: '<ng-content></ng-content>',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MdcList implements AfterContentInit, OnDestroy {
  /** Emits whenever the component is destroyed. */
  private _destroy = new Subject<void>();

  @Input() dense: boolean = false;
  @Input() lines: number = 1;
  @Input() border: boolean = false;

  @Input()
  get avatar(): boolean { return this._avatar; }
  set avatar(value: boolean) {
    this._avatar = toBoolean(value);
  }
  private _avatar: boolean;

  @Input()
  get interactive(): boolean { return this._interactive; }
  set interactive(value: boolean) {
    if (value !== this._interactive) {
      this.setInteractive(value);
    }
  }
  private _interactive: boolean = true;

  @Input()
  get multiple(): boolean { return this._multiple; }
  set multiple(value: boolean) {
    this.setMultiple(value);
  }
  private _multiple: boolean;

  @HostBinding('class.mdc-list') isHostClass = true;
  @HostBinding('attr.role') role: string = 'list';
  @HostBinding('attr.aria-orientation') ariaOrientation: string = 'vertical';
  @HostBinding('class.mdc-list--dense') get classDense(): string {
    return this.dense ? 'mdc-list--dense' : '';
  }
  @HostBinding('class.mdc-list--two-line') get classLines(): string {
    return this.lines === 2 ? 'mdc-list--two-line' : '';
  }
  @HostBinding('class.mdc-list--avatar-list') get classAvatar(): string {
    return this.avatar ? 'mdc-list--avatar-list' : '';
  }
  @HostBinding('class.ng-mdc-list--border') get classBorder(): string {
    return this.border ? 'ng-mdc-list--border' : '';
  }
  @HostBinding('class.mdc-list--non-interactive') get classInteractive(): string {
    return !this.interactive ? 'mdc-list--non-interactive' : '';
  }

  @HostListener('keydown', ['$event']) onkeydown(evt: KeyboardEvent) {
    this._foundation.handleKeydown(evt);
  }
  @HostListener('focusin', ['$event']) onfocusin(evt: FocusEvent) {
    this._foundation.handleFocusIn(evt);
  }
  @HostListener('focusout', ['$event']) onfocusout(evt: FocusEvent) {
    this._foundation.handleFocusOut(evt);
  }

  @ContentChildren(MdcListItem, { descendants: true }) _listItems: QueryList<MdcListItem>;

  /** Emits a change event whenever the selected state of an option changes. */
  @Output() readonly selectionChange: EventEmitter<MdcListItemChange> =
    new EventEmitter<MdcListItemChange>();

  private _mdcAdapter: MDCListAdapter = {
    getListItemCount: () => this._listItems.length,
    getFocusedElementIndex: () => this._listItems.toArray().findIndex((_) => _.getListItemElement() === document.activeElement),
    getListItemIndex: (node: Element) => this._listItems.toArray().findIndex((_) => _.getListItemElement() === node),
    focusItemAtIndex: (ndx: number) => this._listItems.toArray()[ndx].getListItemElement().focus(),
    setTabIndexForListItemChildren: (listItemIndex, tabIndexValue) => {
      const listItemChildren = [].slice.call(this._listItems.toArray()[listItemIndex].getListItemElement()
        .querySelectorAll('button:not(:disabled), a'));
      listItemChildren.forEach((ele) => ele.setAttribute('tabindex', tabIndexValue));
    }
  };

  private _foundation: {
    init(): void,
    destroy(): void,
    setVerticalOrientation(vertical: boolean): void,
    setWrapFocus(wrapFocus: boolean): void,
    handleKeydown(evt: KeyboardEvent): void,
    handleFocusIn(evt: FocusEvent): void,
    handleFocusOut(evt: FocusEvent): void,
    focusNextElement(index: number): void,
    focusPrevElement(index: number): void,
    focusFirstElement(): void,
    focusLastElement(): void
  } = new MDCListFoundation(this._mdcAdapter);

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _ngZone: NgZone,
    public elementRef: ElementRef) { }

  /** Combined stream of all of the child options' change events. */
  readonly optionSelectionChanges: Observable<MdcListSelectionChange> = defer(() => {
    if (this._listItems) {
      return merge(...this._listItems.map(option => option.selectionChange));
    }

    return this._ngZone.onStable
      .asObservable()
      .pipe(take(1), switchMap(() => this.optionSelectionChanges));
  });

  ngAfterContentInit(): void {
    this._foundation.init();
    this._foundation.setVerticalOrientation(true);

    this.optionSelectionChanges.pipe(
      takeUntil(merge(this._destroy, this._listItems.changes))
    ).subscribe(event => {
      this.selectionChange.emit(new MdcListItemChange(this, event.source));
    });

    this._listItems.changes.pipe(startWith(null), takeUntil(this._destroy)).subscribe(() => {
      Promise.resolve().then(() => {
        this.setInteractive(this.interactive);

        if (!this.multiple) {
          this._resetOptions();
        }
      });
    });
  }

  ngOnDestroy(): void {
    this._destroy.next();
    this._destroy.complete();
  }

  /** Drops current option subscriptions and IDs and resets from scratch. */
  private _resetOptions(): void {
    const changedOrDestroyed = merge(this._listItems.changes, this._destroy);

    this.optionSelectionChanges
      .pipe(takeUntil(changedOrDestroyed)
      ).subscribe(event => {
        if (!this.multiple) {
          this.clearSelected(event.source);
        }
      });
  }

  setInteractive(value: boolean): void {
    this._interactive = toBoolean(value);

    if (!this._listItems) {
      return;
    }

    this._listItems.forEach(option => {
      option.setInteractive(value);
    });
  }

  setMultiple(multiple: boolean): void {
    this._multiple = multiple;
    this.clearSelected();

    this._changeDetectorRef.markForCheck();
  }

  clearSelected(skip?: MdcListItem): void {
    if (!this._listItems) {
      return;
    }

    this._listItems.forEach(option => {
      if (option !== skip) {
        option.setSelected(false);
      }
    });
  }
}
