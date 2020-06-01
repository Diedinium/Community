import {
	ITrimConnector,
	IDriveInformation,
	ITrimMainObject,
} from "../../trim-coms/trim-connector";
import { IWordUrl } from "../../office-coms/office-connector";
import { observable } from "mobx";
import { IAppStore, IUserProfile } from "../AppStoreBase";
import TrimMessages from "src/trim-coms/trim-messages";

export class AppStoreWord implements IAppStore {
	showError(error: any, module?: string | undefined): void {
		throw new Error("Method not implemented.");
	}
	fetchFiledRecords(): Promise<any[]> {
		throw new Error("Method not implemented.");
	}
	clearUris(): void {
		throw new Error("Method not implemented.");
	}
	PreservedUris: number[];
	isEmail(): boolean {
		throw new Error("Method not implemented.");
	}
	moreToFile(): boolean {
		throw new Error("Method not implemented.");
	}
	setFileName(fileName: string): void {
		throw new Error("Method not implemented.");
	}
	getSpinningLabel(): string | undefined {
		throw new Error("Method not implemented.");
	}
	spinning: Boolean;
	setSpinning(on: Boolean): void {
		throw new Error("Method not implemented.");
	}
	createRecordFromStyle(
		checkinStyle: number,
		properties: any,
		fields?: any
	): Promise<ITrimMainObject> {
		throw new Error("Method not implemented.");
	}
	createRecord(
		recordType: number,
		properties: any,
		fields?: any
	): Promise<ITrimMainObject> {
		throw new Error("Method not implemented.");
	}
	public documentInfo: IDriveInformation;
	public FileName: string;
	UserProfile?: IUserProfile | undefined;
	errorMessage?: string | undefined;
	messages: TrimMessages;
	fetchBaseSettingFromTrim: any;
	deferFetchDriveInfo(): void {
		throw new Error("Method not implemented.");
	}
	resetError(): void {
		throw new Error("Method not implemented.");
	}
	setError(error: any, module?: string | undefined): void {
		throw new Error("Method not implemented.");
	}
	setErrorMessage(message: string, ...args: string[]): void {
		throw new Error("Method not implemented.");
	}
	openInCM(uri: number): void {
		throw new Error("Method not implemented.");
	}
	getWebClientUrl(uri: number, containerSearch?: boolean | undefined): void {
		throw new Error("Method not implemented.");
	}
	setDocumentInfo(documentInfo: IDriveInformation): void {
		throw new Error("Method not implemented.");
	}
	setStatus(status: string): void {
		throw new Error("Method not implemented.");
	}
	constructor(
		protected trimConnector: ITrimConnector,
		protected wordConnector?: IWordUrl
	) {}
	isOffice(): boolean {
		throw new Error("Method not implemented.");
	}

	@observable public status: string = "ERROR";
}

export default AppStoreWord;
