import AppStoreBase from "./AppStoreBase";

export class AppStoreWord extends AppStoreBase {
	protected getFileName(): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			this.wordConnector!.getWebUrl()
				.then((webUrl) => {
					const tokens = webUrl.split("/");
					resolve(tokens[tokens.length - 1].split(".")[0]);
				})
				.catch((e) => {
					reject(e);
				});
		});
	}

	protected async getFileToSave(): Promise<string> {
		return await this.wordConnector!.getDocumentData(
			(data: number[], fileName: string) => {
				return this.trimConnector!.writeFileSlice(data, fileName);
			}
		);
	}

	public isOffice(): boolean {
		return true;
	}
}

export default AppStoreWord;
