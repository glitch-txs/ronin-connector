import { windowUtils } from "./window";

export const metadata = {
  name: windowUtils.document()?.title ?? '',
  description: windowUtils.document()?.querySelector('meta[name="description"]')?.textContent ?? "",
  url: `${windowUtils.location()}`,
  icons: [`${windowUtils.location()}favicon.ico`],
}