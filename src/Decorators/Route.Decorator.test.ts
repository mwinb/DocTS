import { Response, Request } from 'express';
import { getMockResponse } from '../__mocks__/Express/responseMock';
import { mockMiddleware } from '../__mocks__/Express/mockMiddleware';
import { RouteDoc, getControllerDoc, HttpError, Curryware } from '..';
import { MockControllerWithRoutes } from '../__mocks__/controllerMocks';

let testController: MockControllerWithRoutes;

beforeEach(() => {
  testController = new MockControllerWithRoutes();
});

describe('Router Decorator', () => {
  let routes: Map<string, RouteDoc>;
  beforeEach(() => {
    routes = getControllerDoc(testController).routes;
  });
  it('Adds the functions route to its target class controllerDocs route field', () => {
    expect(routes.get('mockRoute').method).toBe('GET');
  });

  it('adds the decorated function path to the target controllers controllerDocs', () => {
    expect(routes.get('mockRouteWithPath').paths.pop()).toEqual('/:param');
  });

  it('handles multiple paths', () => {
    expect(routes.get('mockRouteWithMultiplePaths').paths.length).toBe(2);
  });

  it('adds the decorated functions middleware to the target controllers controllerDocs', () => {
    expect(routes.get('mockRouteWithMiddleware').middleware).toEqual([mockMiddleware]);
  });

  describe('HandleResponse', () => {
    let mockResponse: Response;
    let returnVal: string;
    let curriers: Curryware[];
    beforeEach(() => {
      mockResponse = getMockResponse();
      returnVal = 'returnValue';
      jest.spyOn(testController, 'mockFn').mockResolvedValueOnce(returnVal);
    });

    describe('defaults', () => {
      let responseHandler: any;
      beforeEach(async () => {
        testController.mockRoute = testController.mockRoute.bind(testController);
      });

      describe('Default Response Hanlder Curryware', () => {
        beforeEach(async () => {
          curriers = getControllerDoc(testController).routes.get('mockRoute').curriers;
          responseHandler = curriers[1](testController.mockRoute);
        });
        it('adds the response handler Curryware by default', async () => {
          await responseHandler({}, mockResponse);
          expect(mockResponse.send).toHaveBeenCalledWith(returnVal);
        });

        it('uses 200 for status code by default', async () => {
          await responseHandler({}, mockResponse);
          expect(mockResponse.status).toHaveBeenLastCalledWith(200);
        });
      });
    });

    it('takes a custom code', async () => {
      testController.mockRouteWithCustomCode = testController.mockRouteWithCustomCode.bind(testController);
      curriers = getControllerDoc(testController).routes.get('mockRouteWithCustomCode').curriers;

      await curriers[1](testController.mockRouteWithCustomCode)({} as Request, mockResponse, {});
      expect(mockResponse.status).toHaveBeenLastCalledWith(201);
    });

    it('allows for disabling response handling', async () => {
      curriers = getControllerDoc(testController).routes.get('mockRouteWithoutResponseHandler').curriers;
      expect(curriers.length).toEqual(1);
    });
  });

  describe('HttpError', () => {
    let curriers: Curryware[];
    let mockResponse: Response;
    beforeEach(() => {
      jest.spyOn(testController, 'mockFn').mockRejectedValueOnce(new HttpError(404, 'Not Found'));
      testController.mockRoute = testController.mockRoute.bind(testController);
      testController.mockRouteNoHttpError = testController.mockRouteNoHttpError.bind(testController);
      mockResponse = getMockResponse();
    });

    it('adds async httpError handling by default', async () => {
      curriers = getControllerDoc(testController).routes.get('mockRoute').curriers;
      await curriers[0](testController.mockRoute)({} as Request, mockResponse, {});
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('allows disabling the async HttpError handling', async () => {
      curriers = getControllerDoc(testController).routes.get('mockRouteNoHttpError').curriers;
      expect(curriers.length).toBe(1);
    });
  });
});
