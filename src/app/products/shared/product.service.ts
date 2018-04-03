import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AngularFireDatabase } from 'angularfire2/database';

import { Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { of } from 'rxjs/observable/of';
import {
  catchError,
  map,
  tap,
  concatMap,
  mergeMap,
  switchMap
} from 'rxjs/operators';
import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/observable/interval';

import { AuthService } from '../../account/shared/auth.service';
import { FileUploadService } from './file-upload.service';
import { MessageService } from '../../messages/message.service';

import { Rating } from '../../models/rating.model';
import { Product } from '../../models/product.model';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable()
export class ProductService {
  private productsUrl = '/products'; // URL to web api

  constructor(
    private http: HttpClient,
    private router: Router,
    private messageService: MessageService,
    private angularFireDatabase: AngularFireDatabase,
    private authService: AuthService,
    private uploadService: FileUploadService
  ) {}

  /** Log a ProductService message with the MessageService */
  private log(message: string) {
    this.messageService.add('ProductService: ' + message);
  }


  /**
   * Handle Http operation that failed.
   * Let the app continue.
   * @param operation - name of the operation that failed
   * @param result - optional value to return as the observable result
   */
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(error); // log to console instead
      this.log(`${operation} failed: ${error.message}`);
      // Let the app keep running by returning an empty result.
      return of(result as T);
    };
  }

  /** GET products from the server */
  getProducts(): Observable<Product[]> {
    return this.angularFireDatabase
      .list<Product>('products', (ref) => ref.orderByChild('date'))
      .valueChanges()
      .map((arr) => arr.reverse())
      .pipe(
        catchError(this.handleError<Product[]>(`getProducts`))
      );
  }

  getProductsQuery(
    byChild: string,
    equalTo: string | boolean,
    limitToFirst: number
  ): Observable<Product[]> {
    return this.angularFireDatabase
      .list<Product>('products', (ref) =>
        ref
          .orderByChild(byChild)
          .equalTo(equalTo)
          .limitToFirst(limitToFirst)
      )
      .valueChanges()
      .pipe(
        catchError(this.handleError<Product[]>(`getProductsQuery`))
      );
  }

  getProductsByDate(limitToLast: number): Observable<Product[]> {
    return this.angularFireDatabase
      .list<Product>('products', (ref) =>
        ref.orderByChild('date').limitToLast(limitToLast)
      )
      .valueChanges()
      .map((arr) => arr.reverse())
      .pipe(
        catchError(this.handleError<Product[]>(`getProductsByDate`))
      );
  }

  getProductsByRating(limitToLast: number): Observable<Product[]> {
    return this.angularFireDatabase
      .list<Product>('products', (ref) =>
        ref.orderByChild('currentRating').limitToLast(limitToLast)
      )
      .valueChanges()
      .map((arr) => arr.reverse())
      .pipe(
        catchError(this.handleError<Product[]>(`getProductsByRating`))
      );
  }

  getFeaturedProducts(): Observable<any[]> {
    return this.angularFireDatabase
      .list<Product>('featured')
      .snapshotChanges()
      .switchMap(
        (actions) => {
          return Observable.combineLatest(
            actions.map((action) => this.getProduct(action.key))
          );
        },
        (actionsFromSource, resolvedProducts) => {
          const combinedProducts = resolvedProducts.map((product, i) => {
            product['imageFeaturedUrl'] = actionsFromSource[
              i
            ].payload.val().imageFeaturedUrl;
            return product;
          });
          return resolvedProducts;
        }
      )
      .pipe(
        catchError(this.handleError<Product[]>(`getFeaturedProducts`))
      );
  }

  /** GET product by id. Will 404 if id not found */
  getProduct(id: any): Observable<Product | null> {
    const url = `${this.productsUrl}/${id}`;
    return this.angularFireDatabase
      .object<Product>(url)
      .valueChanges().pipe(
        tap(result => {
          if (result) {
            this.log(`fetched Product id=${id}}`);
            return of(result);
          } else {
            this.messageService.addError(`Found no Product with id=${id}`);
            return of(null);
          }
        }),
        catchError(this.handleError<Product>(`getProduct id=${id}`))
      );
  }

  rateProduct(product: Product, rating: number) {
    const url = `${this.productsUrl}/${product.id}`;
    const updates = {};

    // Add user rating to local version of ratings
    if (product.ratings) {
      product.ratings[this.authService.getUserUid()] = rating;
    } else {
      product['ratings'] = [];
      product['ratings'][this.authService.getUserUid()] = rating;
    }
    // Calculate and add new overall rating
    const currentRating =
      <number>Object.values(product.ratings).reduce(
        (a: number, b: number) => a + b,
        0
      ) / Object.values(product.ratings).length;

    // Add user rating
    updates['/ratings/' + this.authService.getUserUid() + '/'] = rating;
    updates['/currentRating/'] = currentRating;

    return fromPromise(this.angularFireDatabase
      .object<Product>(url)
      .update(updates)
      .then(() => this.log(`Rated Product ${product.name} width: ${rating}`))
      .catch((error) => {
        this.handleError<any>(error);
      }));
  }

  /** PUT: update the Product on the server */
  updateProduct(data: { product: Product; files: FileList }) {
    const url = `${this.productsUrl}/${data.product.id}`;

    if (!data.files.length) {
      return this.updateProductWithoutNewImage(data.product, url);
    }

    const dbOperation = this.uploadService
      .startUpload(data)
      .then((task) => {
        data.product.imageURLs[0] = task.downloadURL;
        data.product.imageRefs[0] = task.ref.fullPath;

        return data;
      })
      .then((dataWithImagePath) => {
        return this.angularFireDatabase
          .object<Product>(url)
          .update(data.product);
      })
      .then((response) => {
        this.log(`Updated Product ${data.product.name}`);
        return data.product;
      })
      .catch((error) => {
        this.handleError(error);
        return error;
      });
    return fromPromise(dbOperation);
  }

  updateProductWithoutNewImage(product: Product, url: string) {
    const dbOperation = this.angularFireDatabase
      .object<Product>(url)
      .update(product)
      .then((response) => {
        this.log(`Updated Product ${product.name}`);
        return product;
      })
      .catch((error) => {
        this.handleError(error);
        return error;
      });
    return fromPromise(dbOperation);
  }

  /** POST: add a new Product to the server */
  addProduct(data: { product: Product; files: FileList }) {
    const dbOperation = this.uploadService
      .startUpload(data)
      .then((task) => {
        console.log(task);
        console.log(data);
        data.product.imageURLs.push(task.downloadURL);
        data.product.imageRefs.push(task.ref.fullPath);

        return this.angularFireDatabase
          .list('products')
          .set(data.product.id.toString(), data.product);
      }, (error) => error)
      .then((response) => {
        this.log(`Added Product ${data.product.name}`);
        return data.product;
      })
      .catch((error) => {
        this.messageService.addError(
          `Add Failed, Product ${data.product.name}`
        );
        this.handleError(error);
        return error;
      });
    return fromPromise(dbOperation);
  }

  searchProducts(term: string): Observable<Product[]> {
    if (!term.trim()) {
      // if not search term, return empty Product array.
      return of([]);
    }
    return this.http
      .get<Product[]>(`api/products/?name=${term}`)
      .pipe(
        tap(() => this.log(`found Productes matching "${term}"`)),
        catchError(this.handleError<Product[]>('searchProducts', []))
      );
  }

  deleteProduct(product: Product) {
    const url = `${this.productsUrl}/${product.id}`;

    this.uploadService.deleteFile(product.imageRefs);

    return this.angularFireDatabase
      .object<Product>(url)
      .remove()
      .then(() => this.log('success deleting' + product.name))
      .catch((error) => {
        this.messageService.addError('Delete failed ' + product.name);
        this.handleError('delete product');
      });
  }
}
