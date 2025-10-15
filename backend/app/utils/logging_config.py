import logging

from pythonjsonlogger import jsonlogger


def configure_logging(app) -> None:
    if not app.config.get('STRUCTURED_LOGGING', True):
        return
    formatter = jsonlogger.JsonFormatter(
        '%(timestamp)s %(level)s %(name)s %(message)s')
    handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    root_logger = logging.getLogger()
    root_logger.setLevel(app.config.get('SECURITY_LOG_LEVEL', 'INFO'))
    root_logger.handlers = [handler]
    app.logger.handlers = [handler]
