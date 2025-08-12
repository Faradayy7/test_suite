const { test, expect, request } = require("@playwright/test");
const { deleteMedia } = require("../../utils/test-data-manager");
const { ApiClient } = require("../../utils/api-client");


test.describe(
 'Smoke test media',()=>{
  test('Obetener lista medias',async ({request})=>{
        const apiClient = new ApiClient(request);
        const response = await apiClient.get("/api/media");
        expect (response.status).toBe(200);
        expect(response.data.status).toBe("OK");




     }
  )



 }
)