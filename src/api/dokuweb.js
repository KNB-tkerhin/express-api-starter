const express = require("express");
const DokuwebTicketClient = require("../client/DokuwebTicketClient");

const router = express.Router();

router.get("/token", async (req, res) => {
  const client = new DokuwebTicketClient({
    baseUrl: "https://dokuweb.datasec.de/api",
    soapWsdl: "https://dokuweb.datasec.de/api/webservices/Tickets.cfc?wsdl",
    username: "0022api_app",
    password: "dhGvcheTc7!dh(ucWf6",
  });

  const authToken = await client.authenticate()
  res.json({
    authToken
  });
});

router.get("/new-ticket", async (req, res) => {
  const client = new DokuwebTicketClient({
    baseUrl: "https://dokuweb.datasec.de/api", //"https://dokuweb.datasec.de/api", //https://dokuweb-openid-0093.datasec.de/api/webservices/Tickets.cfc?wsdl
    soapWsdl: "https://dokuwebintegration-openid-0093.datasec.de/api/webservices/Tickets.cfc?wsdl",
    username: "0022api_app",
    password: "dhGvcheTc7!dh(ucWf6",
  });

   const token = await client.authenticate();
   console.log("token", token)

   //await client.createTicketV2()
   const newTicket = await client.createTicket({
     subject: 'Test Ticket by K',
     partnerId: '1000.4711.00123.01',
     keyword: 'Mieterhohung'
   });

   res.json({newTicket})

  res.json({message: "OK"})
});

router.get("/keyword", async (req, res) => {
  const client = new DokuwebTicketClient({
    baseUrl: "https://dokuweb.datasec.de/api",
    soapWsdl: "https://dokuweb.datasec.de/api/webservices/Tickets.cfc?wsdl",
    username: "0022api_app",
    password: "dhGvcheTc7!dh(ucWf6",
  });

  const authToken = await client.authenticate()
  const keyowords = client.getKeywords()
  res.json({
    keyowords
  });
});

module.exports = router;
