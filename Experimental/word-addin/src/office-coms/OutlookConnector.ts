import { OfficeConnector, IOfficeConnector } from "./office-connector";
import {
	ITrimConnector,
	ITrimMainObject,
	IDatabase,
} from "../trim-coms/trim-connector";
import { IAppStore } from "../stores/AppStoreBase";
import Axios from "axios";
import { IGetRecordUriResponse } from "./word-connector";

export interface IOutlookAttachment {
	Id: string;
	Name: any;
	Filed?: boolean;
	FileUsing?: ITrimMainObject;
	IsAttachment: Boolean;
}

export interface IOutlookFolder {
	id: string;
	displayName: string;
}
const T_NS = "http://schemas.microsoft.com/exchange/services/2006/types";
const M_NS = "http://schemas.microsoft.com/exchange/services/2006/messages";
export class OutlookConnector extends OfficeConnector
	implements IOfficeConnector {
	_customProps: Office.CustomProperties;

	private loadCustomProps(): Promise<void> {
		return new Promise<void>((resolve) => {
			Office.context.mailbox.item.loadCustomPropertiesAsync((asyncResult) => {
				if (asyncResult.status == Office.AsyncResultStatus.Failed) {
					// Handle the failure.
				} else {
					this._customProps = asyncResult.value;
					resolve();
				}
			});
		});
	}

	public initialize(trimConnector: ITrimConnector, appStore: IAppStore): void {
		this.loadCustomProps().then(() => {
			const handlerFN = () => {
				try {
					this.getItemId();
				} catch {
					appStore.setStatus("PAUSE");
					return;
				}

				if (Office.context.mailbox.item) {
					appStore.setStatus("STARTING");
					appStore.PreservedUris = [];
					trimConnector
						.getDatabaseProperties()
						.then((database: IDatabase) => {
							this.getRecordUrisFromItem(database.Id)
								.then((uris: number[]) => {
									appStore.setDocumentInfo({
										...appStore.documentInfo,
										Uris: uris,
									});
									appStore.setStatus("WAITING");
								})
								.catch((error) => {
									appStore.setError(error, "get mail items");
								});
						})
						.catch((error) => {
							appStore.setError(error, "get mail items");
						});
				}
			};

			Office.context.mailbox.addHandlerAsync(
				Office.EventType.ItemChanged,
				handlerFN
			);
		});
	}

	getRecordUri(): number {
		const prop = Number(this._customProps.get("TRIM_URI"));

		if (isNaN(prop)) {
			return 0;
		} else {
			return prop;
		}
	}
	public getWebUrl(): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			try {
				resolve(this.getItemId());
			} catch (e) {
				reject(e);
			}
		});
	}

	getUri(): Promise<IGetRecordUriResponse> {
		throw new Error("Method not implemented.");
	}
	setUri(uri: number): Promise<IGetRecordUriResponse> {
		throw new Error("Method not implemented.");
	}
	insertText(textToInsert: string): void {
		throw new Error("Method not implemented.");
	}
	insertLink(textToInsert: string, url: string): void {
		throw new Error("Method not implemented.");
	}

	public getAttachments(): IOutlookAttachment[] {
		const item = Office.context.mailbox.item;

		const attachments: IOutlookAttachment[] = [
			{
				Name: Office.context.mailbox.item.subject,
				Id: this.getItemId(),
				IsAttachment: false,
			},
		];
		if (item.attachments.length > 0) {
			for (let i = 0; i < item.attachments.length; i++) {
				const attachment = item.attachments[i];
				if (attachment.attachmentType === "file") {
					attachments.push({
						Id: attachment.id.split("/").join("-"),
						Name: attachment.name,
						IsAttachment: true,
					});
				}
			}
		}

		return attachments;
	}

	makeEwsXml(): string {
		const result =
			'<?xml version="1.0" encoding="utf-8"?>' +
			'<soap:Envelope xmlns:xsi="https://www.w3.org/2001/XMLSchema-instance"' +
			'               xmlns:xsd="https://www.w3.org/2001/XMLSchema"' +
			'               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"' +
			'               xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">' +
			"  <soap:Header>" +
			'    <RequestServerVersion Version="Exchange2013" xmlns="http://schemas.microsoft.com/exchange/services/2006/types" soap:mustUnderstand="0" />' +
			"  </soap:Header>" +
			"  <soap:Body>" +
			'    <FindFolder Traversal="Deep" xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">' +
			"      <FolderShape>" +
			"        <t:BaseShape>IdOnly</t:BaseShape>" +
			"        <t:AdditionalProperties>" +
			'         <t:FieldURI FieldURI="folder:DistinguishedFolderId" />' +
			'         <t:FieldURI FieldURI="folder:ParentFolderId" />' +
			'         <t:FieldURI FieldURI="folder:FolderClass" />' +
			'         <t:FieldURI FieldURI="folder:PolicyTag" />' +
			'         <t:FieldURI FieldURI="folder:DisplayName" />' +
			'<t:ExtendedFieldURI PropertySetId="0708434C-2E95-41C8-992F-8EE34B796FEC" PropertyName="HPRM URN" PropertyType="String"/>' +
			"        </t:AdditionalProperties>" +
			"    </FolderShape>" +
			"    <ParentFolderIds>" +
			'      <t:DistinguishedFolderId Id="msgfolderroot"/>' +
			"    </ParentFolderIds>" +
			"    </FindFolder>" +
			"  </soap:Body>" +
			"</soap:Envelope>";

		return result;
	}

	getParentFolders(
		folderElements: HTMLCollectionOf<Element>,
		parentIdEl: HTMLCollectionOf<Element>
	): Element[] {
		let parentEl = null;
		let parentIdElement = parentIdEl;
		const parents: Element[] = [];
		do {
			if (parentIdEl.length > 0) {
				parentEl = this.getParentFolder(folderElements, parentIdElement);

				if (parentEl !== null) {
					parentIdElement = parentEl.getElementsByTagNameNS(
						T_NS,
						"ParentFolderId"
					);
					parents.splice(0, 0, parentEl);
				}
			}
		} while (parentEl !== null);
		return parents;
	}

	getParentFolder(
		folderElements: HTMLCollectionOf<Element>,
		parentIdEl: HTMLCollectionOf<Element>
	): Element | null {
		if (parentIdEl.length > 0) {
			const parentId = parentIdEl[0].getAttribute("Id");

			for (let i = 0; i < folderElements.length; i++) {
				if (
					parentId ===
					folderElements[i]
						.getElementsByTagNameNS(T_NS, "FolderId")[0]
						.getAttribute("Id")
				) {
					return folderElements[i];
				}
			}
		}

		return null;
	}

	getParentFolderPrefix(
		folderElements: HTMLCollectionOf<Element>,
		parentIdEl: HTMLCollectionOf<Element>
	): string {
		let prefix = "";

		this.getParentFolders(folderElements, parentIdEl).forEach(
			(parentFolder) => {
				prefix += `${
					parentFolder.getElementsByTagNameNS(T_NS, "DisplayName")[0]
						.childNodes[0].nodeValue
				}\\`;
			}
		);
		return prefix;
	}

	getFolders(autoCreateCaption: string): Promise<IOutlookFolder[]> {
		return new Promise<IOutlookFolder[]>((resolve, reject) => {
			const mailbox = Office.context.mailbox;

			try {
				mailbox.makeEwsRequestAsync(this.makeEwsXml(), (result: any) => {
					if (result.status === "succeeded") {
						const parser = new DOMParser();
						const xml = parser.parseFromString(result.value, "text/xml");

						const folderElements = xml.getElementsByTagNameNS(T_NS, "Folder");

						const folders: IOutlookFolder[] = [
							{ id: "cm_auto", displayName: autoCreateCaption },
						];

						for (let i = 0; i < folderElements.length; i++) {
							const folderEl = folderElements[i];
							const parentFolders = this.getParentFolders(
								folderElements,
								folderEl.getElementsByTagNameNS(T_NS, "ParentFolderId")
							);
							let isWellKnown = false;
							let distinguishedFolder = folderEl.getElementsByTagNameNS(
								T_NS,
								"DistinguishedFolderId"
							);

							const hasExtendedProp =
								folderEl.getElementsByTagNameNS(T_NS, "ExtendedProperty")
									.length > 0;

							if (distinguishedFolder.length > 0) {
								isWellKnown = true;
							} else if (parentFolders.length > 0) {
								distinguishedFolder = parentFolders[0].getElementsByTagNameNS(
									T_NS,
									"DistinguishedFolderId"
								);
								if (distinguishedFolder.length > 0) {
									isWellKnown =
										distinguishedFolder[0].childNodes[0].nodeValue! !== "inbox";
								}
							}

							const hasPolicy =
								folderEl.getElementsByTagNameNS(T_NS, "PolicyTag").length > 0;

							const isNoteEl = folderEl.getElementsByTagNameNS(
								T_NS,
								"FolderClass"
							);

							const isNote =
								isNoteEl.length > 0 &&
								isNoteEl[0].childNodes[0].nodeValue! === "IPF.Note";

							const folderIdEl = folderEl.getElementsByTagNameNS(
								T_NS,
								"FolderId"
							);

							if (
								folderIdEl.length > 0 &&
								!isWellKnown &&
								isNote &&
								!hasPolicy &&
								!hasExtendedProp
							) {
								folders.push({
									id: folderIdEl[0].getAttribute("Id")!,
									displayName:
										this.getParentFolderPrefix(
											folderElements,
											folderEl.getElementsByTagNameNS(T_NS, "ParentFolderId")
										) +
										folderEl.getElementsByTagNameNS(T_NS, "DisplayName")[0]
											.childNodes[0].nodeValue!,
								});
							}
						}

						resolve(folders);
					} else {
						reject("Error fetching folders.");
					}

					resolve([]);
				});
			} catch (e) {
				reject(e);
			}
		});
	}

	getFolderChangeKey(folderId: string): Promise<string> {
		const xml =
			'<?xml version="1.0" encoding="utf-8"?>' +
			'<soap:Envelope xmlns:xsi="https://www.w3.org/2001/XMLSchema-instance"' +
			'               xmlns:xsd="https://www.w3.org/2001/XMLSchema"' +
			'               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"' +
			'               xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">' +
			"  <soap:Header>" +
			'    <RequestServerVersion Version="Exchange2013" xmlns="http://schemas.microsoft.com/exchange/services/2006/types" soap:mustUnderstand="0" />' +
			"  </soap:Header>" +
			"    <soap:Body>" +
			'<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"' +
			' xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">' +
			"<FolderShape>" +
			"<t:BaseShape>Default</t:BaseShape>" +
			"</FolderShape>" +
			"<FolderIds>" +
			`<t:FolderId Id="${folderId}"/>` +
			"</FolderIds>" +
			"</GetFolder>" +
			"</soap:Body>" +
			"</soap:Envelope>";

		const mailbox = Office.context.mailbox;

		return new Promise<string>((resolve, reject) => {
			try {
				mailbox.makeEwsRequestAsync(xml, (result: any) => {
					if (result.status === "succeeded") {
						const parser = new DOMParser();
						const xml = parser.parseFromString(result.value, "text/xml");

						const responseMessage = xml.getElementsByTagNameNS(
							M_NS,
							"GetFolderResponseMessage"
						);

						if (responseMessage && responseMessage.length > 0) {
							const responseClass = responseMessage[0].getAttribute(
								"ResponseClass"
							);

							if (responseClass === "Error") {
								const messageText = responseMessage[0].getElementsByTagNameNS(
									M_NS,
									"MessageText"
								);

								if (messageText && messageText.length > 0) {
									reject(
										`${messageText[0].childNodes[0].nodeValue!} (${folderId})`
									);
									return;
								}
							}
						}

						const folderElements = xml.getElementsByTagNameNS(T_NS, "FolderId");

						resolve(folderElements[0].getAttribute("ChangeKey")!);
					} else {
						reject("Error in FolderChangeKey.");
					}
				});
			} catch (e) {
				reject(e);
			}
		});
	}

	setUrnOnFolder(folderId: string, changeKey: string, urn: string): void {
		const xml =
			'<?xml version="1.0" encoding="utf-8"?>' +
			'<soap:Envelope xmlns:xsi="https://www.w3.org/2001/XMLSchema-instance"' +
			'               xmlns:xsd="https://www.w3.org/2001/XMLSchema"' +
			'               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"' +
			'               xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">' +
			"  <soap:Header>" +
			'    <RequestServerVersion Version="Exchange2013" xmlns="http://schemas.microsoft.com/exchange/services/2006/types" soap:mustUnderstand="0" />' +
			"  </soap:Header>" +
			"    <soap:Body>" +
			'    <UpdateFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"' +
			'                  xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">' +
			"      <FolderChanges>" +
			"        <t:FolderChange>" +
			`          <t:FolderId Id="${folderId}" ChangeKey="${changeKey}"/>` +
			"          <t:Updates>" +
			"            <t:SetFolderField>" +
			'				<t:ExtendedFieldURI PropertySetId="0708434C-2E95-41C8-992F-8EE34B796FEC" PropertyName="HPRM URN" PropertyType="String" />' +
			"					<t:Folder>" +
			"					<t:ExtendedProperty>" +
			'					<t:ExtendedFieldURI PropertySetId="0708434C-2E95-41C8-992F-8EE34B796FEC" PropertyName="HPRM URN" PropertyType="String" />' +
			`						<t:Value>${urn}</t:Value>` +
			"					</t:ExtendedProperty>" +
			"					</t:Folder>" +
			"            </t:SetFolderField>" +
			"          </t:Updates>" +
			"        </t:FolderChange>" +
			"      </FolderChanges>" +
			"    </UpdateFolder>" +
			"    </soap:Body>" +
			"    </soap:Envelope>";

		const mailbox = Office.context.mailbox;
		mailbox.makeEwsRequestAsync(xml, (result: any) => {});
	}

	getRecordUrisFromItem(databaseId: string): Promise<number[]> {
		return new Promise<number[]>((resolve, reject) => {
			Office.context.mailbox.getCallbackTokenAsync(
				{ isRest: true },
				(result: any) => {
					if (result.status === "succeeded") {
						var accessToken = result.value;
						this.getWebUrl()
							.then((itemId) => {
								const getMessageUrl =
									Office.context.mailbox.restUrl +
									"/v2.0/me/messages/" +
									itemId +
									"?$expand=SingleValueExtendedProperties($filter=PropertyId eq 'String {0708434C-2E95-41C8-992F-8EE34B796FEC} Name HPRM_RECORD_URN' OR PropertyId eq 'String {00020386-0000-0000-C000-000000000046} Name HPTrimRecordUri' OR PropertyId eq 'String {00020386-0000-0000-C000-000000000046} Name HPTrimDataset')";

								const options = {
									headers: {
										Accept: "application/json",
										Authorization: `Bearer ${accessToken}`,
									},
									method: "GET",
									url: getMessageUrl,
								};
								Axios(options).then((response) => {
									const uris1: number[] = [];
									const uris2: number[] = [];
									let urnDatabaseId: string = "";
									if (response.data.SingleValueExtendedProperties) {
										response.data.SingleValueExtendedProperties.forEach(
											(prop: { PropertyId: string; Value: string }) => {
												if (
													prop.PropertyId ===
													"String {0708434c-2e95-41c8-992f-8ee34b796fec} Name HPRM_RECORD_URN"
												) {
													prop.Value.split(";").forEach((propVal) => {
														const db = propVal.split(":")[1].split("/")[0];
														if (db === databaseId) {
															uris1.push(Number(propVal.split("/").pop()));
														}
													});
												}

												if (
													prop.PropertyId ===
													"String {00020386-0000-0000-c000-000000000046} Name HPTrimRecordUri"
												) {
													prop.Value.split(",").forEach((uriString) => {
														const uri = Number(uriString);

														uris2.push(uri);
													});
												}

												if (
													prop.PropertyId ===
													"String {00020386-0000-0000-c000-000000000046} Name HPTrimDataset"
												) {
													urnDatabaseId = prop.Value;
												}
											}
										);

										if (databaseId === urnDatabaseId) {
											uris2.forEach((uri) => {
												if (!uris1.includes(uri)) {
													uris1.push(uri);
												}
											});
										}
									}
									resolve(uris1);
								});
							})
							.catch((e) => {
								reject(e);
							});
					} else {
						reject(result);
					}
				}
			);
		});
	}

	private getItemId(): string {
		if (Office.context.mailbox.diagnostics.hostName === "OutlookIOS") {
			return Office.context.mailbox.item.itemId;
		} else {
			// Convert to an item ID for API v2.0.
			return Office.context.mailbox.convertToRestId(
				Office.context.mailbox.item.itemId,
				Office.MailboxEnums.RestVersion.v2_0
			);
		}
	}

	setAutoOpen(
		autoOpen: boolean,
		recordUrn?: string,
		subjectPrefix?: string
	): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			Office.context.mailbox.getCallbackTokenAsync(
				{ isRest: true },
				(result: any) => {
					if (result.status === "succeeded") {
						var accessToken = result.value;
						const itemId = this.getItemId();

						const getMessageUrl =
							Office.context.mailbox.restUrl + "/v2.0/me/messages/" + itemId;
						const uris: string[] = [];
						let dbid;
						recordUrn!.split(";").forEach((urn) => {
							let idTokens = urn!.split("/");
							uris.push(idTokens.pop()!);
							dbid = idTokens[0].split(":").pop();
						});

						let data: any = {
							SingleValueExtendedProperties: [
								{
									PropertyId:
										"String {0708434C-2E95-41C8-992F-8EE34B796FEC} Name HPRM_RECORD_URN",
									Value: recordUrn,
								},
								{
									PropertyId:
										"String {00020386-0000-0000-C000-000000000046} Name HPTrimRecordUri",
									Value: uris.join(","),
								},
								{
									PropertyId:
										"String {00020386-0000-0000-C000-000000000046} Name HPTrimDataset",
									Value: dbid,
								},
							],
						};

						if (subjectPrefix) {
							data.Subject = `${Office.context.mailbox.item.subject}`;
							if (!data.Subject.startsWith(subjectPrefix!)) {
								data.Subject = `${subjectPrefix} ${data.Subject}`;
							}
						}

						const options = {
							headers: {
								Accept: "application/json",
								Authorization: `Bearer ${accessToken}`,
							},
							method: "PATCH",
							url: getMessageUrl,
							data,
						};
						Axios(options)
							.then(() => {
								resolve();
							})
							.catch(() => {
								reject();
							});
					} else {
						reject();
					}
				}
			);
		});
	}
	getAutoOpen(): boolean {
		return false;
	}
	saveDocument(): Promise<void> {
		return new Promise((resolve, reject) => {
			resolve();
		});
	}

	getDocumentData(writeSlice: any): Promise<string> {
		throw new Error("Method not implemented.");
	}

	public isSaved(): Promise<boolean> {
		return Promise.resolve(true);
	}
}
