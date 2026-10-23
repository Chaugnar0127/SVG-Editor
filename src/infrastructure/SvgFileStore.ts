import { closeSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { basename, dirname, join } from "node:path";
import type { DocumentStore, LoadedDocument } from "../application/DocumentStore.js";
import type { SvgDocument } from "../domain/document/SvgDocument.js";
import { SvgCodec } from "./SvgCodec.js";

export class SvgFileStore implements DocumentStore {
  public constructor(private readonly codec = new SvgCodec()) {}

  public read(path: string): LoadedDocument {
    let source: string;
    try { source = readFileSync(path, "utf8"); }
    catch { throw new Error(`cannot read file: ${path}`); }
    try { return this.codec.decode(source); }
    catch (error) {
      throw new Error(`invalid SVG: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public write(path: string, document: SvgDocument): void {
    const source = this.codec.encode(document);
    const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
    let created = false;
    let descriptor: number | undefined;
    try {
      descriptor = openSync(temporary, "wx");
      created = true;
      writeFileSync(descriptor, source, "utf8");
      closeSync(descriptor);
      descriptor = undefined;
      renameSync(temporary, path);
    } catch {
      throw new Error(`cannot write file: ${path}`);
    } finally {
      if (descriptor !== undefined) {
        try { closeSync(descriptor); } catch { /* 保留原始写入错误。 */ }
      }
      if (created) {
        try { unlinkSync(temporary); } catch { /* rename 成功后临时路径已不存在。 */ }
      }
    }
  }
}
