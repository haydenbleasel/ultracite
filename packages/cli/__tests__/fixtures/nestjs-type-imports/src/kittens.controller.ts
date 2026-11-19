import { Body, Controller, Post } from "@nestjs/common";

import { CreateCatDto } from "./create-cat.dto";

@Controller("kittens")
export class KittensController {
  @Post()
  create(@Body() cat: CreateCatDto): string {
    return cat.name;
  }
}
