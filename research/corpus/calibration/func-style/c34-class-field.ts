// C34: an instance field initializer that constructs a class defined below (runs on `new`).
export class Server {
  clients = new Clients();
}

class Clients {
  list: string[] = [];
}

export const server = new Server();
