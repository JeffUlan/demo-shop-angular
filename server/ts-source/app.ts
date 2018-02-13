// https://github.com/angular/angular-cli/blob/master/docs/documentation/stories/proxy.md

// Get dependencies
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as morgan from 'morgan';
import * as helmet from 'helmet';
import * as cors from 'cors';
import * as queryParams from 'express-query-params';
import * as appRootDir from 'app-root-dir';

const root = appRootDir.get();
console.log('root: ', root);

appRootDir.set(root);

// Get our API routes
import api from './routes/api.routes';
import users from './routes/user.routes';
import products from './routes/products.routes';

// create app
const app = express();

// apply middleware:
// logging
app.use(morgan('common'));

// security
app.use(helmet());

// cross origin handler
app.use(cors());

// parsers for POST data
app.use(bodyParser.json());

// parse query params
app.use(queryParams());

// api routes.
app.use('/api', api);
app.use('/api/users', users);
app.use('/api/products', products);

export default app;