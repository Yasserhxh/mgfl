using FluentAssertions;
using MGFL.Domain.Services;
using Xunit;

namespace MGFL.Domain.Tests;

public class PasswordHasherTests
{
    [Fact]
    public void Verify_accepts_the_original_password()
    {
        var hash = PasswordHasher.Hash("Pesage@2026");
        PasswordHasher.Verify("Pesage@2026", hash).Should().BeTrue();
    }

    [Fact]
    public void Verify_rejects_a_wrong_password()
    {
        var hash = PasswordHasher.Hash("Pesage@2026");
        PasswordHasher.Verify("pesage@2026", hash).Should().BeFalse();
    }

    [Fact]
    public void Hash_uses_a_random_salt_per_call()
    {
        PasswordHasher.Hash("same").Should().NotBe(PasswordHasher.Hash("same"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-a-hash")]
    [InlineData("abc.def")]
    [InlineData("0.AAAA.BBBB")]
    [InlineData("100000.%%%.BBBB")]
    public void Verify_rejects_malformed_stored_hashes(string stored)
    {
        PasswordHasher.Verify("whatever", stored).Should().BeFalse();
    }
}
