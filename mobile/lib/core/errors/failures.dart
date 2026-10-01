abstract class Failure {
  final String message;
  final int? statusCode;

  const Failure(this.message, [this.statusCode]);
}

class NetworkFailure extends Failure {
  const NetworkFailure([super.message = 'Network connection failed. Please check your internet connection.', super.statusCode]);
}

class UnauthorizedFailure extends Failure {
  const UnauthorizedFailure([super.message = 'Session expired or unauthorized. Please log in again.', super.statusCode = 401]);
}

class ForbiddenFailure extends Failure {
  const ForbiddenFailure([super.message = 'You do not have permission to perform this action.', super.statusCode = 403]);
}

class NotFoundFailure extends Failure {
  const NotFoundFailure([super.message = 'Requested resource not found.', super.statusCode = 404]);
}

class ConflictFailure extends Failure {
  const ConflictFailure([super.message = 'Conflict occurred.', super.statusCode = 409]);
}

class ServerFailure extends Failure {
  const ServerFailure([super.message = 'Internal server error occurred.', super.statusCode = 500]);
}

class ValidationFailure extends Failure {
  const ValidationFailure(super.message, [super.statusCode = 400]);
}
