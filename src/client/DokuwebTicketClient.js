/**
 * DokuwebTicketClient.js
 *
 * A Node.js client for interacting with the Doku@WEB ticket API.
 *
 * Features:
 *   - Authenticate (obtain an authToken via HTTP Basic)
 *   - Create a new ticket
 *   - Fetch available keywords
 *   - Retrieve ticket details
 *   - Search for tickets by creator (CREATE_BY)
 *
 * Dependencies:
 *   - axios: for REST calls
 *   - soap: for SOAP-based operations
 *
 * Usage:
 *   const client = new DokuwebTicketClient({
 *     baseUrl: 'https://dokuweb.datasec.de/api',
 *     soapWsdl: 'https://dokuweb.datasec.de/api/webservices/Tickets.cfc?wsdl',
 *     username: 'YOUR_DOKUWEB_USERNAME',
 *     password: 'YOUR_DOKUWEB_PASSWORD'
 *   });
 *
 *   await client.authenticate();
 *   const newTicket = await client.createTicket({
 *     subject: 'Test Ticket',
 *     partnerId: '1000.4711.00123.01',
 *     keyword: 'Mieterhöhung'
 *   });
 *
 *   const keywords = await client.getKeywords({ channel: 'EMAIL' });
 *   const details = await client.getTicketDetails(newTicket.ticketid);
 *   const ticketsByMe = await client.searchTicketsByCreator('myLogin');
 */

const axios = require("axios");
const soap = require("soap");

class DokuwebTicketClient {
  /**
   * @param {Object} options
   * @param {string} options.baseUrl  Base REST URL (e.g., https://dokuweb.datasec.de/api)
   * @param {string} options.soapWsdl Full WSDL URL for Tickets.cfc (SOAP) (e.g., https://dokuweb.datasec.de/api/webservices/Tickets.cfc?wsdl)
   * @param {string} options.username Doku@WEB username (for basic auth)
   * @param {string} options.password Doku@WEB password (for basic auth)
   */
  constructor({ baseUrl, soapWsdl, username, password }) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // trim trailing slash
    this.soapWsdl = soapWsdl;
    this.username = username;
    this.password = password;

    this.authToken = null;
    this.soapClient = null;
  }

  /**
   * Authenticate by fetching an authToken using Basic HTTP auth.
   * The token is valid indefinitely until password changes.
   *
   * GET {baseUrl}/dokuweb/auth/token
   *   - Basic Auth: username/password
   *   - On success: returns authToken (plain text)
   *
   * @returns {Promise<string>} authToken
   */
  async authenticate() {
    const authUrl = `${this.baseUrl}/dokuweb/auth/token`;
    const credentials = Buffer.from(
      `${this.username}:${this.password}`
    ).toString("base64");

    try {
      const response = await axios.get(authUrl, {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      });

      // The token is returned as plain text in the response body.
      this.authToken = response.data.trim();
      return this.authToken;
    } catch (err) {
      throw new Error(
        `Authentication failed: ${err.response?.status} ${err.response?.statusText}`
      );
    }
  }

  /**
   * Initialize the SOAP client once the authToken is available.
   * Internally used before any SOAP-based method.
   */
  async _getSoapClient() {
    if (!this.soapClient) {
      if (!this.authToken) {
        throw new Error("authToken is missing. Call authenticate() first.");
      }
      // Create a SOAP client; will be reused for all SOAP calls.
      this.soapClient = await soap.createClientAsync(this.soapWsdl);
      // Attach authToken as a SOAP header for future calls.
      // Doku@WEB expects authToken as the first parameter in each SOAP call,
      // so we don't need a SOAP header; we will pass authToken as the first argument.
    }
    return this.soapClient;
  }

  /**
   * Create a new ticket.
   *
   * Uses SOAP method createTicket:
   *   - Endpoint: https://dokuweb.datasec.de/api/webservices/Tickets.cfc?wsdl
   *   - Operation: createTicket
   *   - Required parameters:
   *       authToken, sSubject, sPartner, sKeyword
   *   - Returns: 'true|[ticketid]|[ticketnr]' on success
   *
   * @param {Object} params
   * @param {string} params.subject   Ticket subject (Betreff)
   * @param {string} params.partnerId Partner ID (e.g., '1000.4711.00123.01')
   * @param {string} params.keyword   Keyword (Schlagwort) (must already exist)  :contentReference[oaicite:0]{index=0}
   * @param {Object} [params.options] Optional additional parameters:
   *    - category (sCategory)
   *    - channel (sChannel)
   *    - description (sDescription)
   *    - type (sType)
   *    - ticketGroup (sTicketgroup)
   *    - fieldValues (sFieldvalues JSON string)
   *    - priority (sPriority)
   *    - ticketSystem (sTicketsystem)
   *
   * @returns {Promise<{ ticketid: string, ticketnr: string }>}
   */
  async createTicket({ subject, partnerId, keyword, options = {} }) {
    const client = await this._getSoapClient();
    const methodArgs = {
      authToken: this.authToken,
      sSubject: subject,
      sPartner: partnerId,
      sKeyword: keyword,
      sCategory: options.category || "",
      sChannel: options.channel || "POST",
      sDescription: options.description || "",
      sType: options.type || "1",
      sPLZ: "",
      sTicketgroup: options.ticketGroup || "",
      sFieldvalues: options.fieldValues || "",
      sPriority: options.priority || "",
      sTicketsystem: options.ticketSystem || "",
    };

    try {
      // callAsync returns [result, rawResponse, soapHeader, rawRequest]
      const [result] = await client.createTicketAsync(methodArgs);
      // result.createTicketReturn is like: 'true|[ticketid]|[ticketnr]'
      const ret = result.createTicketReturn;
      const parts = ret.split("|");
      if (parts[0] !== "true") {
        throw new Error(`Ticket creation failed: ${ret}`);
      }
      const ticketid = parts[1];
      const ticketnr = parts[2];
      return { ticketid, ticketnr };
    } catch (err) {
      console.log(err);
      throw new Error(`createTicket SOAP error: ${err.message}`);
    }
  }

  async createTicketV2() {
    const args = {
      // These argument names must match the WSDL service definition
      authToken: this.authToken, // Replace with your actual auth token
      ticketName: "Beispielticket 1",
      ticketNumber: "1000.4711.00123.01",
      reason: "Mieterhöhung",
    };

    console.log("Creating client")
    soap.createClient(this.soapWsdl, (err, client) => {
      console.log("Error: ", err)
      if (err) {
        console.log("Error appeared")
        console.error("SOAP Client Error:", err);
        return;
      }

      console.log("Creating master ticket")
      client.createMasterTicket(args, (err, result, rawResponse, soapHeader, rawRequest) => {
        if (err) {
          
          console.error("Invocation Error:", err);
          console.log("Raw Response:", rawResponse);
          console.log("Raw Request:", rawRequest);
          console.log("Soap header:", soapHeader)
        } else {
          console.log("Result:", result);
        }
      });
    });

  }

  /**
   * Fetch all available keywords.
   *
   * Uses SOAP method getKeywords:
   *   - Endpoint: https://dokuweb.datasec.de/api/webservices/Tickets.cfc?wsdl
   *   - Operation: getKeywords
   *   - Required parameters:
   *       authToken
   *       sChannel (optional, input channel; leave blank for all)
   *       sTicketsystem (optional)
   *   - Returns: JSON string with SUCCESS=true and DATA array of keywords:
   *       KEYWORD, CATEGORY, TICKETTYPE, TICKETGROUP, PROCESS, DESCRIPTION  :contentReference[oaicite:1]{index=1}
   *
   * @param {Object} [params]
   * @param {string} [params.channel]     Input channel (e.g., 'EMAIL', 'PHONE')
   * @param {string} [params.ticketSystem] Ticket system code (if applicable)
   * @returns {Promise<Array<Object>>} List of keyword objects
   */
  async getKeywords({ channel = "", ticketSystem = "" } = {}) {
    const client = await this._getSoapClient();
    const methodArgs = {
      authToken: this.authToken,
      sChannel: channel,
      sTicketsystem: ticketSystem,
    };

    try {
      const [result] = await client.getKeywordsAsync(methodArgs);
      // result.getKeywordsReturn is a JSON string
      const parsed = JSON.parse(result.getKeywordsReturn);
      if (!parsed.SUCCESS) {
        throw new Error(`getKeywords failed: ${parsed.ERRORTEXT}`);
      }
      return parsed.DATA; // array of keyword objects
    } catch (err) {
      console.log(err)
      throw new Error(`getKeywords SOAP error: ${err.message}`);
    }
  }

  /**
   * Retrieve ticket details by ticket ID.
   *
   * Uses REST endpoint:
   *   GET {baseUrl}/dokuweb/ticket/{ticketid}
   *   - Returns an XML payload containing one <ticket> element with attributes:
   *       ticketid, priority, channel, ticketmailbox, state, subject, description,
   *       create_by, create_on, category, ticketnr, step, process, type,
   *       update_by, update_on, partnerid, keyword, reminderdate, search_type  :contentReference[oaicite:2]{index=2}
   *
   * @param {string} ticketId
   * @returns {Promise<Object>} Parsed ticket attributes
   */
  async getTicketDetails(ticketId) {
    const url = `${this.baseUrl}/dokuweb/ticket/${encodeURIComponent(
      ticketId
    )}`;
    try {
      const response = await axios.get(url, {
        params: { authtoken: this.authToken },
      });
      // Response is XML. For simplicity, we can parse attributes with a basic regex or use a lightweight parser.
      // Here we'll do a simple regex to extract attributes from the <ticket ... /> element.
      const xml = response.data;
      const ticketMatch = xml.match(/<ticket\s([^>]+)\/>/);
      if (!ticketMatch) {
        throw new Error("No <ticket> element found in response.");
      }
      const attrString = ticketMatch[1];
      // Extract all key="value" pairs
      const attrs = {};
      const attrRegex = /(\w+)="([^"]*)"/g;
      let m;
      while ((m = attrRegex.exec(attrString)) !== null) {
        attrs[m[1]] = m[2];
      }
      return attrs;
    } catch (err) {
      throw new Error(
        `getTicketDetails REST error: ${err.response?.status} ${err.response?.statusText}`
      );
    }
  }

  /**
   * Search for tickets where CREATE_BY equals the given creatorLogin.
   *
   * Uses REST endpoint:
   *   GET {baseUrl}/dokuweb/tickets/
   *   - Parameter: field_count=1&f1=CREATE_BY&f1_op==&f1_val={creatorLogin}
   *   - Returns XML with <tickets> root, containing multiple <ticket ... /> elements  :contentReference[oaicite:3]{index=3}
   *
   * @param {string} creatorLogin  The login/username to search by (CREATE_BY field)
   * @param {Object} [options]
   * @param {number} [options.start=1]  Starting index (default: 1)
   * @param {number} [options.max=10]   Max results (default: 10, up to 5000)
   * @returns {Promise<Array<Object>>} List of ticket attribute objects
   */
  async searchTicketsByCreator(creatorLogin, { start = 1, max = 10 } = {}) {
    const params = {
      authtoken: this.authToken,
      start,
      max,
      field_count: 1,
      f1: "CREATE_BY",
      f1_op: "=",
      f1_val: creatorLogin,
    };
    const url = `${this.baseUrl}/dokuweb/tickets/`;
    try {
      const response = await axios.get(url, { params });
      // Parse XML in response.data similarly to getTicketDetails
      const xml = response.data;
      const tickets = [];
      // Regex to match each <ticket ... />
      const ticketRegex = /<ticket\s([^>]+?)\/>/g;
      let m;
      while ((m = ticketRegex.exec(xml)) !== null) {
        const attrString = m[1];
        const attrs = {};
        const attrRegex = /(\w+)="([^"]*)"/g;
        let am;
        while ((am = attrRegex.exec(attrString)) !== null) {
          attrs[am[1]] = am[2];
        }
        tickets.push(attrs);
      }
      return tickets;
    } catch (err) {
      throw new Error(
        `searchTicketsByCreator REST error: ${err.response?.status} ${err.response?.statusText}`
      );
    }
  }
}

module.exports = DokuwebTicketClient;
