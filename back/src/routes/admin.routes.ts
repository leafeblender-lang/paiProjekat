import express from 'express';
import { AdminController } from '../controllers/admin.controller';

const adminRouter = express.Router();

adminRouter.route('/sportovi').get(
    (req, res) => new AdminController().dohvatiSportove(req, res)
);

adminRouter.route('/treneri').post(
    (req, res) => new AdminController().dohvatiTrenere(req, res)
);


adminRouter.route('/registracije').post(
    (req, res) =>
        new AdminController().dohvatiZahteveRegistracije(req, res)
);

adminRouter.route('/korisnici').post(
    (req, res) => new AdminController().dohvatiKorisnike(req, res)
);

adminRouter.route('/korisnik/izmeni').post(
    (req, res) => new AdminController().izmeniKorisnika(req, res)
);

adminRouter.route('/korisnik/obrisi').post(
    (req, res) => new AdminController().obrisiKorisnika(req, res)
);


adminRouter.route('/registracija/status').post(
    (req, res) =>
        new AdminController().promeniStatusRegistracije(req, res)
);

adminRouter.route('/objekti').post(
    (req, res) =>
        new AdminController().dohvatiZahteveObjekata(req, res)
);

adminRouter.route('/objekat/status').post(
    (req, res) =>
        new AdminController().promeniStatusObjekta(req, res)
);


adminRouter.route('/trener/status').post(
    (req, res) => new AdminController().promeniStatusTrenera(req, res)
);

adminRouter.route('/sport/dodaj').post(
    (req, res) => new AdminController().dodajSport(req, res)
);

export default adminRouter;
