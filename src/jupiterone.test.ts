import { J1Client, gatherFacts }  from './jupiterone';
import { config } from '../test/fixtures/testConfig';

describe('jupiterone initializes client', () => {
  it('J1Client initializes client', async () => {
    const { j1Account, j1AuthToken } = config.env;
    expect(j1Account).toEqual('j1test');
    const j1 = new J1Client(j1Account as string, j1AuthToken as string);
    await j1.init();
    expect(j1.getClient().account).toEqual('j1test')
  });

  it('J1Client gathers entities via queryV1 api', async () => {
    const initSpy = jest.fn();
    const querySpy = jest.fn().mockResolvedValue([]);
    const mockJ1NodeJSClient = {
      init: initSpy,
      queryV1: querySpy
    };
    const { j1Account, j1AuthToken } = config.env;
    const j1 = new J1Client(
      j1Account as string,
      j1AuthToken as string,
      jest.fn().mockImplementation(() => mockJ1NodeJSClient));
    await j1.init();
    expect(initSpy).toHaveBeenCalled();
    const j1ql = 'Find SomeEntity with property = "foo"';
    await j1.gatherEntities(j1ql);
    expect(querySpy).toHaveBeenCalledWith(j1ql);
  });

  it('gatherFacts initializes JupiterOne-related facts, includes J1Client', async () => {
    expect(config.facts.j1.client).toBeFalsy();
    const j1Facts = await gatherFacts(config);
    expect(j1Facts.j1.client).toBeTruthy();
    expect(typeof j1Facts.j1.client?.gatherEntities).toEqual('function');
  });
});
