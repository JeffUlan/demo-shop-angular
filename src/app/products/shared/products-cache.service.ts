import { Injectable } from '@angular/core';

import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import { publishReplay } from 'rxjs/operators/publishReplay';
import { refCount } from 'rxjs/operators/refCount';
import { switchMap } from 'rxjs/operators/switchMap';

import { Product } from '../../models/product.model';

@Injectable()
export class ProductsCacheService {
  private products: Observable<Product[]>;

  public get(key: string | number, fallback: Observable<Product[]>) {
    if (typeof key === 'string') {
      return this.getProducts(fallback);
    } else {
      return this.getProduct(key, fallback);
    }
  }

  private getProducts(fallback: Observable<Product[]>) {
    if (!this.products) {
      this.products = fallback.pipe(publishReplay(1), refCount());
    }
    return this.products;
  }

  private getProduct(key: any, fallback: Observable<Product[]>) {
    return this.getProducts(fallback).pipe(
      switchMap((products) => {
        const selectedProduct = products.filter((product) => {
          if (product.id === key) {
            return product;
          } else {
            return null;
          }
        })[0];
        return of(selectedProduct);
      }),
      publishReplay(1),
      refCount()
    );
  }

  public clearCache() {
    this.products = null;
  }
}
