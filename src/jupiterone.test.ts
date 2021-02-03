import { J1Client }  from './jupiterone';
import { config } from '../test/fixtures/testConfig';

describe('jupiterone initializes client', () => {
  it('J1Client initializes client', async () => {
    expect(config.env.j1Account).toEqual('j1test');
    const j1 = new J1Client(config);
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
    const j1 = new J1Client(config, jest.fn().mockImplementation(() => mockJ1NodeJSClient));
    await j1.init();
    expect(initSpy).toHaveBeenCalled();
    const j1ql = 'Find SomeEntity with property = "foo"';
    await j1.gatherEntities(j1ql);
    expect(querySpy).toHaveBeenCalledWith(j1ql);
  });
});
