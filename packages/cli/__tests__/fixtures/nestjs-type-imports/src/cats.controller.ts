import { Controller, Get } from "@nestjs/common";

import { CatsService } from "./cats.service";

@Controller("cats")
export class CatsController {
  constructor(private readonly cats: CatsService) {}

  @Get()
  list(): string[] {
    return this.cats.list();
  }
}
