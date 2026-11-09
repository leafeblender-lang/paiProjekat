import express from 'express';
import { ObjektiController } from '../controllers/objekti.controller';

const objektiRouter = express.Router();



objektiRouter.route('/pretraga').post(
    (req, res) => new ObjektiController().pretraga(req, res)
);

objektiRouter.route('/detalji/:id').get(
    (req, res) => new ObjektiController().detaljiDohvatiObjekat(req, res)
);



objektiRouter.route('/sportista/terminiObjekta').post(
    (req, res) => new ObjektiController().dohvatiZauzeteTermineObjekta(req, res)
);



objektiRouter.route('/sportista/oceneObjekta').post(
    (req, res) => new ObjektiController().dohvatiOceneObjekta(req, res)
);

objektiRouter.route('/sportista/dodajocenu').post(
    (req, res) => new ObjektiController().dodajOcenu(req, res)
);



objektiRouter.route('/sportista/oglasi').post(
    (req, res) => new ObjektiController().dohvatiOglaseSportista(req, res)
);


objektiRouter.route('/sportista/zatvoriOglas').post(
    (req, res) => new ObjektiController().zatvoriOglas(req, res)
);

objektiRouter.route('/sportista/treneri').post(
    (req, res) => new ObjektiController().dohvatiTrenere(req, res)
);


objektiRouter.route('/sportista/opremadohvati').post(
    (req, res) => new ObjektiController().dohvatiSvuOpremu(req, res)
);


objektiRouter.route('/sportista/narudzbine').post(
    (req, res) => new ObjektiController().narudzbineSportiste(req, res)
);

objektiRouter.route('/sportista/otkaziNarudzbinu').post(
    (req, res) => new ObjektiController().otkaziNarudzbinuSportista(req, res)
);

objektiRouter.route('/zaposleni/objekti').post(
    (req, res) => new ObjektiController().dohvatiObjekteZaposlenog(req, res)
);

objektiRouter.route('/zaposleni/sacuvajObjekat').post(
    (req, res) => new ObjektiController().sacuvajObjekat(req, res)
);

objektiRouter.route('/zaposleni/importobjekata').post(
    (req, res) => new ObjektiController().importObjekata(req, res)
);

objektiRouter.route('/zaposleni/termini').post(
    (req, res) => new ObjektiController().terminiZaposlenog(req, res)
);

objektiRouter.route('/zaposleni/prihvatiTermin').post(
    (req, res) => new ObjektiController().prihvatiTermin(req, res)
);

objektiRouter.route('/zaposleni/otkazitermin').post(
    (req, res) => new ObjektiController().otkaziTerminZaposleni(req, res)
);

objektiRouter.route('/zaposleni/dosao').post(
    (req, res) => new ObjektiController().dosaoNaTermin(req, res)
);

objektiRouter.route('/zaposleni/nijedosao').post(
    (req, res) => new ObjektiController().nijeDosaoNaTermin(req, res)
);


objektiRouter.route('/zaposleni/sacuvajpromociju').post(
    (req, res) => new ObjektiController().sacuvajPromociju(req, res)
);


objektiRouter.route('/zaposleni/sacuvajOpremu').post(
    (req, res) => new ObjektiController().sacuvajOpremu(req, res)
);

objektiRouter.route('/zaposleni/oprema').post(
    (req, res) => new ObjektiController().opremaZaZaposlenog(req, res)
);

objektiRouter.route('/zaposleni/promocije').post(
    (req, res) => new ObjektiController().promocijeZaZaposlenog(req, res)
);

objektiRouter.route('/zaposleni/narudzbine').post(
    (req, res) => new ObjektiController().narudzbineZaZaposlenog(req, res)
);

objektiRouter.route('/zaposleni/promeniStatusNarudzbine').post(
    (req, res) => new ObjektiController().promeniStatusNarudzbine(req, res)
);

objektiRouter.route('/zaposleni/promeniTermin').post(
    (req, res) => new ObjektiController().promeniTermin(req, res)
);

objektiRouter.route('/zaposleni/izvestajPopunjenost/:firmaId/:objekatId/:mesec').get(
    (req, res) => new ObjektiController().izvestajPopunjenost(req, res)
);

objektiRouter.route('/zaposleni/izvestajOprema/:firmaId/:mesec').get(
    (req, res) => new ObjektiController().izvestajOprema(req, res)
);



objektiRouter.route('/pocetnagetall').get(
    (req, res) => new ObjektiController().dohvatPodatkePocetna(req, res)
);


objektiRouter.route('/sportista/getrezervacijesportista').post(
    (req, res) => new ObjektiController().dohvatiRezervacijeSportiste(req, res)
);


objektiRouter.route('/sportista/otkazitermin').post(
    (req, res) => new ObjektiController().otkaziTerminSportista(req, res)
);

objektiRouter.route('/sportista/pretraga').post(
    (req, res) => new ObjektiController().pretragaObjekataSportista(req, res)
);

objektiRouter.route('/sportista/rezervisitermin').post(
    (req, res) => new ObjektiController().rezervisiTermin(req, res)
);

objektiRouter.route('/sportista/objavioglas').post(
    (req, res) => new ObjektiController().objaviOglas(req, res)
);


objektiRouter.route('/sportista/posaljizahtevzaoglas').post(
    (req, res) => new ObjektiController().posaljiZahtevOglas(req, res)
);

objektiRouter.route('/sportista/updatezahtevoglas').post(
    (req, res) => new ObjektiController().updateZahtevOglas(req, res)
);

objektiRouter.route('/sportista/zakazitrening').post(
    (req, res) => new ObjektiController().zakaziTrening(req, res)
);

objektiRouter.route('/sportista/narucikorpu').post(
    (req, res) => new ObjektiController().naruciKorpu(req, res)
);





































export default objektiRouter;
