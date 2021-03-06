//import "../../node_modules/@microsoft/office-js/dist/office.js";
//import {Word} from "../../node_modules/@microsoft/office-js/dist/word-15.js";
import { WordConnector } from "./word-connector";
//import "../../node_modules/@microsoft/office-js/dist/office.js";

// (function() {
//   Office.initialize = function() {
//     // If you need to initialize something you can do so here.
//     //  loadProps();
//   };
// })();

//let wordjs = "../../node_modules/@microsoft/office-js/dist/word-15.js";

let Mock_Action = "";
let uriProp = { key: "", value: "" };
let addedItem = { key: "", value: "" };
let addedItemSynced: any = {};
let testToken = "";
export namespace Word {
	export const run = function(callback) {
		return callback({
			document: {
				properties: {
					customProperties: {
						getItem: function(itemName) {
							uriProp.key = itemName;
							return uriProp;
						},
						add: (key: string, value: any) => {
							addedItem = { key, value };
							return uriProp;
						},
					},
				},
			},
			load: function() {},
			sync: function() {				
				if (Mock_Action == "ERROR_IN_SYNC") {
					throw new Error("big error");
				} else if (Mock_Action == "URI_NULL") {
					uriProp.value = null;
				} else if (Mock_Action == "URI_0") {
					uriProp.value = "0";
				} else if (Mock_Action === "Add_Uri") {
					uriProp.value = addedItem.value;
				} else {
					uriProp.value = "1";
				}

				addedItemSynced = addedItem;
				return new Promise(function(resolve, reject) {
					if (Mock_Action == "URI_ERROR") {
						reject("an error");
					} else if (Mock_Action == "URI_ERROR_WITH_MESSAGE_PROP") {
						reject({ message: "an error" });
					} else {
						resolve();
					}
				});
			},
		});
	};
}
(<any>global).Word = Word;

export namespace Office {
	export const context = {
    document: {
      url: "https://hperm-my.sharepoint.com/personal/alex_hperm_info/Documents/Document8.docx";
    }
  }
}

export namespace OfficeRuntime {
	export const auth = {
    getAccessToken: () =>{	return new Promise((resolve) => {
		resolve(testToken);
	});}
  }
}


(<any>global).Office = Office;
(<any>global).OfficeRuntime = OfficeRuntime;
// export namespace Office {
//   export const initialize = function() {};
// }
// (<any>global).Office = Office;

describe("word apis", () => {
	const wordConnector = new WordConnector();
beforeEach(() =>{
	testToken = "";
	localStorage.removeItem("access-token");
});


	test("the default is not OK", async () => {
		Mock_Action = "URI_NULL";
		expect.assertions(1);

		let data = await wordConnector.getUri();
		expect(data.found).toBeFalsy();

	});

	test("the record Uri == 1", async () => {
		Mock_Action = "URI_0";
		expect.assertions(2);
		const data = await wordConnector.getUri();
		expect(data.found).toBeFalsy();
		expect(data.uri).toEqual(0);

	});

	test("the record Uri == 1", async () => {
		Mock_Action = "URI_1";
		expect.assertions(2);
		const data = await wordConnector.getUri();
		expect(data.found).toBeTruthy();
		expect(data.uri).toEqual(1);

	});

	test("Error on get Uri", async () => {
		Mock_Action = "URI_ERROR";
		expect.assertions(2);
		const data = await wordConnector.getUri();
		expect(data.found).toBeFalsy();
		expect(data.message).toEqual("");

	});

	test("Error on get Uri, with message in message property", async () => {
		Mock_Action = "URI_ERROR_WITH_MESSAGE_PROP";
		expect.assertions(2);
		const data = await wordConnector.getUri();
			expect(data.found).toBeFalsy();
			expect(data.message).toEqual("");

	});

	test("Error in sync, probably not able to find custom prop", () => {
		Mock_Action = "ERROR_IN_SYNC";
		expect.assertions(2);
		return wordConnector.getUri().catch((data) => {
			expect(data.found).toBeFalsy();
			expect(data.message).toEqual("big error");
		});
	});


	// move to appStore tests
	// it("name from document URL", async () => {
	// 	expect(wordConnector.getName()).toEqual("Document8");
	// });

	test("Set uri in custom prop", async () => {
		Mock_Action = "Add_Uri";
		expect.assertions(3);
		const data = await wordConnector.setUri(9)
		expect(data.uri).toBe(9);
		expect(uriProp.key).toEqual("CM_Record_Uri");
		expect(uriProp.value).toEqual("9");
	});

	const createJwt = (exp:Date): any => {
		const prefix = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IkhsQzBSMTJza3hOWjFXUXdtak9GXzZ0X3RERSJ9.";
		try {
			const jwt = {exp:exp.getTime()/1000}
			return `${prefix}${btoa(JSON.stringify(jwt))}`;
		} catch (e) {
			return null;
		}
	};

	test("get token", async () => {
		testToken = createJwt(new Date());
		
		const token = await wordConnector.getAccessToken();
		expect(token).toEqual(testToken);

	});

	// test("get token from cache", async () => {
	// 	testToken = createJwt(new Date());
	// 	const cacheToken = createJwt(new Date(new Date().getTime()+5000 /1000));

	// 	localStorage.setItem("access-token", cacheToken);

	// 	const token = await wordConnector.getAccessToken();
	// 	expect(token).toEqual(cacheToken);

	// });

	test("token in cache is stale", async () => {
		testToken = createJwt(new Date());
	//	const cacheToken = createJwt(new Date(new Date().getTime() + 1*60000));

		const cacheToken = createJwt(new Date(new Date().getTime()-1000 /1000));

		localStorage.setItem("access-token", cacheToken);

		const token = await wordConnector.getAccessToken();
		expect(token).toEqual(testToken);

	});

	// test("token is added to cache", async () => {
	// 	testToken = createJwt(new Date());
	
	// 	const token = await wordConnector.getAccessToken();
	// 	expect(localStorage.getItem("access-token")).toEqual(token);
	// });

});
